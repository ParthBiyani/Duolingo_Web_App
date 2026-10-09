"""The default learner, Parth Biyani (@parthbiyani), with a history relative to "now".

The story the data tells: Parth joined 50 days ago and kept a 21-day streak, took a break, and
is now on a 12-day streak that last grew yesterday, so today's first lesson makes it 13. Each
active day has a ``daily_activity`` row and XP awards, 1,240 XP in all. Unit 1 is complete,
with its chest claimed and Greetings at Legendary; the first lesson of unit 2 was done
yesterday.

The gem ledger replays what was earned on the way (goal chests, the path chest, achievement
levels, two podium finishes) and spent (a streak freeze, a Legendary entry), after an opening
grant that brings the balance to exactly 500. ``user_stats`` holds the matching totals, so
every cache equals the sum of its ledger from the start.
"""

import math
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from itertools import accumulate, pairwise
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.achievements import ACHIEVEMENTS, GEMS_PER_LEVEL, level_for
from app.domain.dates import local_date, local_midnight_utc, week_start
from app.domain.goals import GOAL_CHEST_GEMS
from app.domain.leagues import reward_gems
from app.domain.xp import LEGENDARY_XP, LESSON_XP, MAX_COMBO_BONUS, REVIEW_XP
from app.models import (
    Achievement,
    Course,
    DailyActivity,
    GemTransaction,
    Skill,
    SkillProgress,
    User,
    UserAchievement,
    UserSettings,
    UserStats,
    XpEvent,
)
from app.models.ledger import GemReason, XpSource
from app.seed.catalog import LEGENDARY_ENTRY_PRICE, STREAK_FREEZE_PRICE

USERNAME = "parthbiyani"
DISPLAY_NAME = "Parth Biyani"
TIMEZONE = "Asia/Kolkata"
AVATAR_COLOR = "#1CB0F6"
DAILY_GOAL_XP = 20

# XP earned on each active day, oldest first: a 21-day streak that ended, then MISSED_DAYS
# without practice, then the current 12-day streak up to yesterday. 785 + 455 = 1,240 XP.
PAST_STREAK_XP = (
    25,
    37,
    41,
    38,
    35,
    42,
    32,
    46,
    32,
    15,
    38,
    40,
    85,
    37,
    44,
    36,
    17,
    33,
    40,
    36,
    36,
)
CURRENT_STREAK_XP = (34, 41, 26, 45, 38, 30, 44, 36, 25, 47, 33, 56)
MISSED_DAYS = 17
LEGENDARY_DAY = 13  # 1-based: the 85 XP day ends with Greetings' Legendary challenge

GEMS = 500
HEARTS = 4
HEART_LOST_AGO = timedelta(hours=2)  # so the next heart arrives in 3 hours
STREAK_FREEZES = 1
LEAGUE_TIER = 1  # Silver this week
PODIUM_TIER = 0  # both podium finishes were in Bronze
PERFECT_XP = LESSON_XP + MAX_COMBO_BONUS  # a lesson without a mistake earns the full combo

MORNING = time(7, 0)  # when Parth joined, and when the streak freeze was bought
SESSION_TIMES = (time(7, 40), time(12, 30), time(18, 15), time(20, 5), time(21, 30), time(22, 40))


@dataclass
class _Session:
    """One completed session of the generated history."""

    at: datetime
    day: date
    amount: int
    source: XpSource
    skill: Skill | None = None  # the path node, for path lessons and the Legendary challenge


@dataclass(frozen=True)
class _Gems:
    at: datetime
    delta: int
    reason: GemReason
    ref: str | None = None


def seed_learner(session: Session, course: Course, now: datetime) -> User:
    """Create the default learner and their whole history, ending yesterday."""
    today = local_date(now, TIMEZONE)
    days = _active_days(today)
    history = _history(days)
    _place_path_lessons(history, course)

    user = User(
        username=USERNAME,
        display_name=DISPLAY_NAME,
        avatar_color=AVATAR_COLOR,
        timezone=TIMEZONE,
        is_bot=False,
        current_course_id=course.id,
        created_at=_at(days[0], MORNING),
        settings=UserSettings(daily_goal_xp=DAILY_GOAL_XP),
    )
    session.add(user)
    session.flush()  # assigns user.id

    promoted_at = local_midnight_utc(week_start(days[0]) + timedelta(weeks=1), TIMEZONE)
    podiums = _league_rewards(days[0], today, promoted_at)
    freeze_bought_at = _at(days[len(PAST_STREAK_XP)], MORNING)  # the day the streak restarted
    gems = [
        *_record_activity(session, user, history),
        *_record_path_progress(session, user, course, history),
        *_record_achievements(session, user, history, days, promoted_at),
        *podiums,
        _Gems(freeze_bought_at, -STREAK_FREEZE_PRICE, "streak_freeze"),
    ]
    _record_gems(session, user, gems)

    session.add(
        UserStats(
            user_id=user.id,
            xp_total=sum(s.amount for s in history),
            gems=GEMS,
            hearts=HEARTS,
            hearts_anchor_at=now - HEART_LOST_AGO,
            streak_current=len(CURRENT_STREAK_XP),
            streak_longest=max(len(PAST_STREAK_XP), len(CURRENT_STREAK_XP)),
            streak_last_date=days[-1],
            streak_freezes=STREAK_FREEZES,
            lessons_completed=len(history),
            perfect_lessons=sum(1 for s in history if _is_perfect(s)),
            legendary_skills=sum(1 for s in history if s.source == "legendary"),
            top3_finishes=len(podiums),
            league_tier=LEAGUE_TIER,
        )
    )
    session.flush()
    return user


def split_xp(total: int) -> list[int]:
    """Split a day's XP into session awards: lessons of 10-15 XP, plus a 5 XP review if needed."""
    if total < LESSON_XP:
        raise ValueError(f"a day needs at least {LESSON_XP} XP, got {total}")
    reviews = []
    count = math.ceil(total / PERFECT_XP)  # the fewest lessons that can hold the total
    if count * LESSON_XP > total:  # 16-19 XP: one lesson is too little and two are too much
        reviews = [REVIEW_XP]
        total -= REVIEW_XP
        count = math.ceil(total / PERFECT_XP)
    base, extra = divmod(total, count)  # spread the XP as evenly as possible
    return [base + 1] * extra + [base] * (count - extra) + reviews


def _active_days(today: date) -> list[date]:
    """The active days, oldest first: the past streak, a gap, then the current streak."""
    current_start = today - timedelta(days=len(CURRENT_STREAK_XP))
    past_start = current_start - timedelta(days=MISSED_DAYS + len(PAST_STREAK_XP))
    past = [past_start + timedelta(days=n) for n in range(len(PAST_STREAK_XP))]
    current = [current_start + timedelta(days=n) for n in range(len(CURRENT_STREAK_XP))]
    return past + current


def _history(days: Sequence[date]) -> list[_Session]:
    """Turn the daily XP into sessions: practice and reviews, plus the Legendary challenge."""
    history: list[_Session] = []
    daily_xp = PAST_STREAK_XP + CURRENT_STREAK_XP
    for number, (day, total) in enumerate(zip(days, daily_xp, strict=True), start=1):
        legendary = number == LEGENDARY_DAY
        awards: list[tuple[int, XpSource]] = [
            (amount, "review" if amount == REVIEW_XP else "practice")
            for amount in split_xp(total - LEGENDARY_XP if legendary else total)
        ]
        if legendary:
            awards.append((LEGENDARY_XP, "legendary"))  # after the day's practice
        for slot, (amount, source) in enumerate(awards):
            history.append(_Session(_at(day, SESSION_TIMES[slot]), day, amount, source))
    return history


def _place_path_lessons(history: list[_Session], course: Course) -> None:
    """Mark the path lessons in the history.

    Unit 1's lessons, in path order, are the first practice sessions; yesterday's last session
    is the first lesson of unit 2; the Legendary challenge was on unit 1's first skill.
    """
    first_unit, second_unit = course.units[0], course.units[1]
    unit_one_lessons = [skill for skill in first_unit.skills for _lesson in skill.lessons]
    practice = [s for s in history if s.source == "practice"]
    if len(practice) <= len(unit_one_lessons) or history[-1].source != "practice":
        raise ValueError("the history is too short for the path progress")
    for record, skill in zip(practice, unit_one_lessons, strict=False):
        record.source, record.skill = "lesson", skill
    history[-1].source, history[-1].skill = "lesson", _first_lesson_skill(second_unit.skills)
    for record in history:
        if record.source == "legendary":
            record.skill = _first_lesson_skill(first_unit.skills)


def _record_activity(session: Session, user: User, history: Sequence[_Session]) -> list[_Gems]:
    """Write the XP ledger and one activity row per day; return the goal chests opened."""
    session.add_all(
        XpEvent(user_id=user.id, source=s.source, amount=s.amount, occurred_at=s.at,
                local_date=s.day)
        for s in history
    )  # fmt: skip
    chests: list[_Gems] = []
    for day in sorted({s.day for s in history}):
        sessions = [s for s in history if s.day == day]
        totals = list(accumulate(s.amount for s in sessions))
        goal_met_at = next(
            (s.at for s, xp in zip(sessions, totals, strict=True) if xp >= DAILY_GOAL_XP), None
        )
        session.add(
            DailyActivity(
                user_id=user.id,
                local_date=day,
                xp=totals[-1],
                sessions_completed=len(sessions),
                goal_xp=DAILY_GOAL_XP,
                goal_met_at=goal_met_at,
                streak_status="extended",
            )
        )
        if goal_met_at is not None:
            chests.append(_Gems(goal_met_at, GOAL_CHEST_GEMS, "goal_chest", f"goal:{day}"))
    return chests


def _record_path_progress(
    session: Session, user: User, course: Course, history: Sequence[_Session]
) -> list[_Gems]:
    """Write the progress on each path node; return the chest reward and the Legendary entry."""
    progress: dict[int, SkillProgress] = {}
    gems: list[_Gems] = []
    for record in history:
        if record.skill is None:
            continue
        skill = record.skill
        row = progress.setdefault(
            skill.id,
            SkillProgress(user_id=user.id, skill_id=skill.id, lessons_completed=0, crown_level=0),
        )
        if record.source == "legendary":
            row.crown_level, row.legendary_at = 2, record.at
            entry_at = record.at - timedelta(minutes=1)
            gems.append(_Gems(entry_at, -LEGENDARY_ENTRY_PRICE, "legendary_entry"))
        else:
            row.lessons_completed += 1
            if row.lessons_completed == len(skill.lessons):
                row.crown_level, row.completed_at = 1, record.at

    # Unit 1's chest was opened a minute after the node before it was completed.
    for before, chest in pairwise(course.units[0].skills):
        if chest.type == "chest" and chest.chest_gems is not None:
            completed_at = progress[before.id].completed_at
            if completed_at is None:
                raise ValueError("a chest can only be claimed after the node before it")
            claimed_at = completed_at + timedelta(minutes=1)
            progress[chest.id] = SkillProgress(
                user_id=user.id,
                skill_id=chest.id,
                lessons_completed=0,
                crown_level=0,
                completed_at=claimed_at,  # a claimed chest counts as a completed node
            )
            gems.append(_Gems(claimed_at, chest.chest_gems, "path_chest", f"chest:{chest.id}"))
    session.add_all(progress.values())
    return gems


def _record_achievements(
    session: Session,
    user: User,
    history: Sequence[_Session],
    days: Sequence[date],
    promoted_at: datetime,
) -> list[_Gems]:
    """Give each achievement the level its statistic has reached, as the app computes it.

    Each level's gems are dated when the statistic first reached that level's threshold.
    Wildfire follows the best streak, as the app does: the old 21-day streak earned level 3,
    and it stands at 21 of 30 days towards level 4.
    """
    first_session: dict[date, datetime] = {}
    xp_today: dict[date, int] = {}
    daily_xp: list[tuple[datetime, int]] = []
    for s in history:
        first_session.setdefault(s.day, s.at)
        xp_today[s.day] = xp_today.get(s.day, 0) + s.amount
        daily_xp.append((s.at, xp_today[s.day]))
    times = [s.at for s in history]
    streaks = (days[: len(PAST_STREAK_XP)], days[-len(CURRENT_STREAK_XP) :])
    series: dict[str, list[tuple[datetime, int]]] = {
        "streak": [
            (first_session[day], n) for streak in streaks for n, day in enumerate(streak, start=1)
        ],
        "xp_total": list(zip(times, accumulate(s.amount for s in history), strict=True)),
        "perfect_lessons": list(
            zip(times, accumulate(int(_is_perfect(s)) for s in history), strict=True)
        ),
        # Highest league reached, as tier + 1: Bronze from the first day, Silver a week later.
        "league_tier": [(times[0], 1), (promoted_at, LEAGUE_TIER + 1)],
        "daily_xp": daily_xp,
        "legendary_skills": [(s.at, 1) for s in history if s.source == "legendary"],
    }
    rows = {achievement.key: achievement for achievement in session.scalars(select(Achievement))}
    gems: list[_Gems] = []
    for definition in ACHIEVEMENTS:
        points = series[definition.metric]
        best = max((value for _at_time, value in points), default=0)
        level, progress, _target = level_for(best, definition.thresholds)
        reached = [
            next(at for at, value in points if value >= threshold)
            for threshold in definition.thresholds[:level]
        ]
        gems += [
            _Gems(at, GEMS_PER_LEVEL, "achievement", f"achievement:{definition.key}:{number}")
            for number, at in enumerate(reached, start=1)
        ]
        session.add(
            UserAchievement(
                user_id=user.id,
                achievement_id=rows[definition.key].id,
                level=level,
                progress=progress,
                updated_at=reached[-1] if reached else user.created_at,
            )
        )
    return gems


def _league_rewards(first_day: date, today: date, promoted_at: datetime) -> list[_Gems]:
    """Two podium finishes, both in Bronze: 2nd in the first week and 1st last week."""
    first_week = week_start(first_day)
    last_week = week_start(today) - timedelta(weeks=1)
    return [
        _Gems(promoted_at, reward_gems(2, PODIUM_TIER), "league_reward", f"league:{first_week}"),
        _Gems(
            local_midnight_utc(week_start(today), TIMEZONE),
            reward_gems(1, PODIUM_TIER),
            "league_reward",
            f"league:{last_week}",
        ),
    ]


def _record_gems(session: Session, user: User, gems: Sequence[_Gems]) -> None:
    """Write the gem ledger in time order with running balances, after an opening grant."""
    opening = GEMS - sum(entry.delta for entry in gems)
    if opening <= 0:
        raise ValueError("the history spends more gems than the target balance")
    balance = 0
    for entry in [_Gems(user.created_at, opening, "seed"), *sorted(gems, key=lambda g: g.at)]:
        balance += entry.delta
        session.add(
            GemTransaction(
                user_id=user.id,
                delta=entry.delta,
                reason=entry.reason,
                ref=entry.ref,
                balance_after=balance,
                created_at=entry.at,
            )
        )


def _first_lesson_skill(nodes: Sequence[Skill]) -> Skill:
    return next(node for node in nodes if node.type == "lesson")


def _is_perfect(record: _Session) -> bool:
    return record.source in ("lesson", "practice") and record.amount == PERFECT_XP


def _at(day: date, clock_time: time) -> datetime:
    """A local time on ``day`` in the learner's time zone, as a UTC instant."""
    return datetime.combine(day, clock_time, tzinfo=ZoneInfo(TIMEZONE)).astimezone(UTC)
