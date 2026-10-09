"""Seeding: row counts, idempotency, the default learner's state, ledgers and the CLI."""

import re
import shutil
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date, timedelta
from functools import partial
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import Engine, delete, func, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.clock import get_clock_offset, set_clock_offset
from app.core.db import create_db_engine
from app.domain.dates import local_midnight_utc
from app.domain.hearts import MAX_HEARTS
from app.domain.path_state import NodeInput, NodeProgress, compute_node_states
from app.models import (
    Achievement,
    Course,
    DailyActivity,
    Exercise,
    GemTransaction,
    League,
    LeagueCohort,
    LeagueMembership,
    Lesson,
    ShopItem,
    Skill,
    SkillProgress,
    Unit,
    User,
    UserAchievement,
    UserSettings,
    UserStats,
    XpEvent,
)
from app.seed import __main__ as seed_cli
from app.seed.learners import ISHA, KABIR, LEARNERS, PARTH, ZOE
from app.seed.runner import is_seeded, reset_people, seed_database
from tests.conftest import CONTENT_DIR, NOW, sqlite_url

TODAY = date(2026, 10, 9)  # NOW in Asia/Kolkata
YESTERDAY = TODAY - timedelta(days=1)

# Three fixture units, each: 4 lesson skills x 3 lessons x 10 exercises, a chest and a
# 15-exercise review.
EXPECTED_ROWS = {
    Course: 6,
    Unit: 3,
    Skill: 18,
    Lesson: 39,
    Exercise: 3 * (4 * 3 * 10 + 15),
    User: 4 + 27,  # the sample learners and the rivals who fill their shared cohort
    UserSettings: 4,  # the learners only; rivals have no settings or stats
    UserStats: 4,
    DailyActivity: (21 + 12) + 0 + (3 + 4) + (26 + 64),
    League: 10,
    LeagueCohort: 1,  # Parth, Isha and Kabir share Silver; Ananya's leaderboard is locked
    LeagueMembership: 30,
    Achievement: 6,
    UserAchievement: 4 * 6,
    ShopItem: 4,
}


# A unit's node states with two skills and the chest done, and the third skill started.
HALFWAY = ["completed", "completed", "completed", "active", "locked", "locked"]


def count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def row_counts(db: Session) -> dict[type, int]:
    return {model: count(db, model) for model in EXPECTED_ROWS}


def learner(db: Session, username: str = PARTH.username) -> User:
    return db.scalars(select(User).where(User.username == username)).one()


def node_states(db: Session, user: User) -> dict[int, str]:
    """Each path node's state for ``user``, as the path screen computes it."""
    assert user.current_course is not None
    nodes = [node for unit in user.current_course.units for node in unit.skills]
    progress = db.scalars(select(SkillProgress).where(SkillProgress.user_id == user.id))
    states = compute_node_states(
        [NodeInput(node.id, node.type, len(node.lessons)) for node in nodes],
        {
            row.skill_id: NodeProgress(
                row.lessons_completed, row.crown_level, row.completed_at is not None
            )
            for row in progress
        },
    )
    return {node.id: node.state for node in states}


def gem_ledger(db: Session, user_id: int) -> list[GemTransaction]:
    query = select(GemTransaction).where(GemTransaction.user_id == user_id)
    return list(db.scalars(query.order_by(GemTransaction.created_at, GemTransaction.id)))


def test_seed_creates_the_expected_rows(db: Session) -> None:
    assert is_seeded(db)
    assert row_counts(db) == EXPECTED_ROWS
    assert db.scalar(select(func.count()).where(Course.is_available.is_(True))) == 1


def test_seeding_a_seeded_database_changes_nothing(db: Session) -> None:
    before = row_counts(db)
    assert seed_database(db, NOW, CONTENT_DIR) is False
    assert row_counts(db) == before


def test_invalid_content_is_rejected_before_anything_is_written(
    empty_db_path: Path, tmp_path: Path
) -> None:
    content = tmp_path / "content"
    shutil.copytree(CONTENT_DIR, content)
    unit = content / "unit_1.yaml"
    unit.write_text(unit.read_text(encoding="utf-8").replace("color: green", "color: teal"),
                    encoding="utf-8")  # fmt: skip
    engine = create_db_engine(sqlite_url(empty_db_path))
    try:
        with Session(engine) as session:
            with pytest.raises(ValidationError, match="color"):
                seed_database(session, NOW, content)
            assert count(session, Course) == 0
    finally:
        engine.dispose()


@pytest.mark.parametrize(
    ("username", "xp", "gems"),
    [(PARTH.username, 1240, 500), (ZOE.username, 0, 50), (ISHA.username, 205, 320),
     (KABIR.username, 4120, 950)],
)  # fmt: skip
def test_caches_equal_their_ledgers(db: Session, username: str, xp: int, gems: int) -> None:
    stats = learner(db, username).stats
    xp_events = db.scalar(select(func.sum(XpEvent.amount)).where(XpEvent.user_id == stats.user_id))
    daily_xp = db.scalar(
        select(func.sum(DailyActivity.xp)).where(DailyActivity.user_id == stats.user_id)
    )
    assert stats.xp_total == (xp_events or 0) == (daily_xp or 0) == xp

    ledger = gem_ledger(db, stats.user_id)
    assert ledger[0].reason == "seed"  # the opening grant
    assert stats.gems == sum(entry.delta for entry in ledger) == gems
    balance = 0
    for entry in ledger:
        balance += entry.delta
        assert entry.balance_after == balance >= 0


def test_every_learner_starts_with_full_hearts_in_kolkata(db: Session) -> None:
    for profile in LEARNERS:
        user = learner(db, profile.username)
        assert (user.is_bot, user.timezone) == (False, "Asia/Kolkata")
        assert (user.stats.hearts, user.stats.hearts_anchor_at) == (MAX_HEARTS, None)


def test_the_new_learner_has_not_started(db: Session) -> None:
    user = learner(db, ZOE.username)
    stats = user.stats
    assert user.created_at < NOW
    assert (stats.xp_total, stats.streak_current, stats.streak_longest) == (0, 0, 0)
    assert (stats.lessons_completed, stats.league_tier, stats.streak_last_date) == (0, 0, None)
    assert set(node_states(db, user).values()) == {"active", "locked"}
    rows = db.scalars(select(UserAchievement).where(UserAchievement.user_id == user.id))
    assert {row.level for row in rows} == {0}


def test_the_early_learner_is_halfway_through_unit_one(db: Session) -> None:
    user = learner(db, ISHA.username)
    assert user.current_course is not None
    unit_one = user.current_course.units[0]
    state = node_states(db, user)
    assert [state[node.id] for node in unit_one.skills] == HALFWAY
    assert (user.stats.streak_current, user.stats.streak_last_date) == (4, YESTERDAY)
    assert user.stats.league_tier == 1  # promoted to Silver at the end of last week


def test_the_advanced_learner_is_deep_in_unit_three(db: Session) -> None:
    user = learner(db, KABIR.username)
    assert user.current_course is not None
    unit_one, unit_two, unit_three = user.current_course.units
    state = node_states(db, user)
    assert [state[node.id] for node in unit_one.skills] == ["legendary"] + ["completed"] * 5
    assert [state[node.id] for node in unit_two.skills] == ["legendary"] + ["completed"] * 5
    assert [state[node.id] for node in unit_three.skills] == HALFWAY
    stats = user.stats
    assert (stats.streak_current, stats.streak_freezes, stats.league_tier) == (64, 2, 1)
    assert (stats.legendary_skills, stats.top3_finishes) == (2, 2)
    champion = db.scalars(
        select(UserAchievement)
        .join(Achievement)
        .where(UserAchievement.user_id == user.id, Achievement.key == "champion")
    ).one()
    assert champion.level == 3  # reached Gold before the demotion, and a level is kept


def test_default_learner_state(db: Session) -> None:
    user = learner(db)
    stats = user.stats
    assert (user.display_name, user.timezone, user.is_bot) == (
        "Parth Biyani",
        "Asia/Kolkata",
        False,
    )
    assert user.created_at.date() == date(2026, 8, 20)
    assert user.settings.daily_goal_xp == 20
    assert (stats.hearts, stats.hearts_anchor_at) == (MAX_HEARTS, None)
    assert stats.streak_current == 12
    assert stats.streak_longest == 21
    assert stats.streak_last_date == YESTERDAY
    assert stats.streak_freezes == 1
    assert (stats.league_tier, stats.top3_finishes, stats.legendary_skills) == (1, 2, 1)


def test_history_is_two_streaks_with_missed_days_between(db: Session) -> None:
    user = learner(db)
    activity = list(
        db.scalars(
            select(DailyActivity)
            .where(DailyActivity.user_id == user.id)
            .order_by(DailyActivity.local_date)
        )
    )
    days = [row.local_date for row in activity]
    past, current = days[:21], days[21:]
    assert current == [YESTERDAY - timedelta(days=n) for n in reversed(range(12))]
    assert past == [past[0] + timedelta(days=n) for n in range(21)]
    assert (current[0] - past[-1]).days > 1  # the past streak ended
    assert all(row.streak_status == "extended" for row in activity)
    for row in activity:
        assert (row.goal_met_at is not None) == (row.xp >= row.goal_xp)

    goal_refs = {entry.ref for entry in gem_ledger(db, user.id) if entry.reason == "goal_chest"}
    assert goal_refs == {f"goal:{row.local_date}" for row in activity if row.goal_met_at}


def test_path_shows_unit_one_complete_and_unit_two_started(db: Session) -> None:
    user = learner(db)
    assert user.current_course is not None
    unit_one, unit_two, unit_three = user.current_course.units
    progress = {
        row.skill_id: row
        for row in db.scalars(select(SkillProgress).where(SkillProgress.user_id == user.id))
    }
    state = node_states(db, user)
    assert [state[node.id] for node in unit_one.skills] == ["legendary"] + ["completed"] * 5
    assert state[unit_two.skills[0].id] == "active"
    assert progress[unit_two.skills[0].id].lessons_completed == 1
    assert {state[node.id] for node in [*unit_two.skills[1:], *unit_three.skills]} == {"locked"}

    chest = next(node for node in unit_one.skills if node.type == "chest")
    chest_refs = [entry.ref for entry in gem_ledger(db, user.id) if entry.reason == "path_chest"]
    assert chest_refs == [f"chest:{chest.id}"]


def test_achievement_levels_and_their_gems(db: Session) -> None:
    user = learner(db)
    rows = db.scalars(select(UserAchievement).where(UserAchievement.user_id == user.id))
    levels = {row.achievement.key: (row.level, row.progress) for row in rows}
    assert levels == {
        "wildfire": (3, 21),  # the old 21-day streak, 21 of 30 days towards level 4
        "sage": (4, 1240),
        "sharpshooter": (2, 13),
        "champion": (2, 2),  # Silver
        "overachiever": (1, 85),
        "legendary": (1, 1),
    }
    paid = {entry.ref for entry in gem_ledger(db, user.id) if entry.reason == "achievement"}
    assert paid == {
        f"achievement:{key}:{level}"
        for key, (reached, _progress) in levels.items()
        for level in range(1, reached + 1)
    }


def test_unlocked_learners_share_one_league_week_with_27_rivals(db: Session) -> None:
    monday = date(2026, 10, 5)
    cohort = db.scalars(select(LeagueCohort)).one()
    assert (cohort.tier, cohort.week_start, cohort.finalized_at) == (1, monday, None)

    members = cohort.memberships
    humans = {member.user.username for member in members if not member.user.is_bot}
    assert humans == {PARTH.username, ISHA.username, KABIR.username}  # all in Silver
    assert all(profile.league_tier == 1 for profile in LEARNERS if profile.username in humans)
    zoe = learner(db, ZOE.username)
    assert db.get(LeagueMembership, (cohort.id, zoe.id)) is None  # locked: no cohort yet

    rivals = [member.user for member in members if member.user.is_bot]
    assert len(members) == 30
    assert len(rivals) == 27
    assert {member.joined_at for member in members} == {local_midnight_utc(monday, "Asia/Kolkata")}
    assert all(rival.bot_pace_xp is not None and 40 <= rival.bot_pace_xp <= 600 for rival in rivals)
    assert all(re.fullmatch(r"\w+ [A-Z]\.", rival.display_name) for rival in rivals)
    assert len({rival.username for rival in rivals}) == 27
    assert len({rival.avatar_color for rival in rivals}) > 5


def test_reset_restores_people_and_keeps_content(db: Session) -> None:
    exercises = list(db.scalars(select(Exercise.id).order_by(Exercise.id)))
    user = learner(db)
    user.stats.xp_total = 0
    db.execute(delete(XpEvent).where(XpEvent.user_id == user.id))

    zoe = learner(db, ZOE.username)
    zoe.stats.gems = 0

    learners = reset_people(db, NOW)
    db.commit()

    assert [user.username for user in learners] == [profile.username for profile in LEARNERS]
    assert learner(db, ZOE.username).stats.gems == 50
    fresh = learner(db)
    assert fresh.stats.xp_total == 1240
    assert db.scalar(select(func.sum(XpEvent.amount)).where(XpEvent.user_id == fresh.id)) == 1240
    assert row_counts(db) == EXPECTED_ROWS
    assert list(db.scalars(select(Exercise.id).order_by(Exercise.id))) == exercises


@pytest.fixture
def cli_engine(empty_db_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Engine]:
    """Point the seed command at an empty test database and the fixture content."""
    engine = create_db_engine(sqlite_url(empty_db_path))
    factory = sessionmaker(bind=engine)

    @contextmanager
    def test_scope() -> Iterator[Session]:
        with factory.begin() as session:
            yield session

    monkeypatch.setattr(seed_cli, "session_scope", test_scope)
    monkeypatch.setattr(seed_cli, "seed_database", partial(seed_database, content_dir=CONTENT_DIR))
    yield engine
    engine.dispose()


def test_cli_if_empty_seeds_once(cli_engine: Engine) -> None:
    assert seed_cli.main(["--if-empty"]) == 0
    with Session(cli_engine) as session:
        first = row_counts(session)
    assert seed_cli.main(["--if-empty"]) == 0
    with Session(cli_engine) as session:
        assert row_counts(session) == first


def test_cli_reset_resets_the_clock_and_the_people(cli_engine: Engine) -> None:
    assert seed_cli.main(["--reset"]) == 0  # on an empty database it seeds everything
    with Session(cli_engine) as session, session.begin():
        set_clock_offset(session, 86_400)
        learner(session).stats.gems = 0
    assert seed_cli.main(["--reset"]) == 0
    with Session(cli_engine) as session:
        assert get_clock_offset(session) == 0
        assert learner(session).stats.gems == 500


def test_cli_needs_exactly_one_mode() -> None:
    with pytest.raises(SystemExit):
        seed_cli.main([])
    with pytest.raises(SystemExit):
        seed_cli.main(["--if-empty", "--reset"])
