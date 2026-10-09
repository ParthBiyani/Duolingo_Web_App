"""Seed a learner and their whole history, relative to "now", from a ``LearnerProfile``.

A profile tells the story in a few numbers: the XP of each active day, grouped into streaks
with missed days between them (the last streak ends yesterday), how far along the path the
learner is, which skills reached Legendary, the league weeks and the gem balance. Everything
else is derived the way the app derives it while it runs:

- every active day has a ``daily_activity`` row and its XP split into session awards;
- the first path lessons fill the earliest practice sessions and yesterday's last session was
  the newest one, so each chest opens a minute after the node before it is completed;
- achievement levels follow the statistics, each level's gems dated when it was reached;
- the gem ledger replays what was earned (goal chests, path chests, achievement levels and
  podium finishes) and spent (streak freezes and Legendary entries) after an opening grant
  that brings the balance to exactly ``gems``.

``user_stats`` holds the matching totals, so every cache equals the sum of its ledger from the
start. The sample learners themselves live in ``app.seed.learners``.
"""

import math
import random
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from itertools import accumulate, pairwise
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.achievements import ACHIEVEMENTS, GEMS_PER_LEVEL, level_for
from app.domain.dates import local_date, local_midnight_utc, week_start
from app.domain.goals import GOAL_CHEST_GEMS
from app.domain.hearts import MAX_HEARTS
from app.domain.leagues import TIERS, reward_gems
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
from app.models.learner import DailyGoal
from app.models.ledger import GemReason, XpSource
from app.seed.catalog import LEGENDARY_ENTRY_PRICE, STREAK_FREEZE_PRICE
from app.services.achievements import LEADERBOARD_UNLOCK_LESSONS

PERFECT_XP = LESSON_XP + MAX_COMBO_BONUS  # a lesson without a mistake earns the full combo

MORNING = time(7, 0)  # when a learner with a history joined, and when freezes were bought
EVENING = time(21, 0)  # when a learner without any history yet signed up, yesterday
SESSION_TIMES = (time(7, 40), time(12, 30), time(18, 15), time(20, 5), time(21, 30), time(22, 40))


@dataclass(frozen=True)
class Podium:
    """A top-three finish in a league week.

    ``week`` counts from the week the learner joined (0) or, when negative, back from the
    current week (-1 is last week). The prize is paid when that week ends.
    """

    week: int
    rank: int
    tier: int


@dataclass(frozen=True)
class LearnerProfile:
    """Everything that makes one sample learner different from another."""

    username: str
    display_name: str
    avatar_color: str
    daily_goal_xp: DailyGoal
    gems: int  # the balance today; the opening grant makes up the difference
    # XP earned on each active day, oldest first, one tuple per streak. The last streak ended
    # yesterday; ``gaps`` holds the days missed between one streak and the next.
    streaks: tuple[tuple[int, ...], ...] = ()
    gaps: tuple[int, ...] = ()
    path_lessons: int = 0  # lessons completed along the path, in course order
    # Legendary challenges as (active day, 1-based; lesson skill, 0-based in path order).
    legendary: tuple[tuple[int, int], ...] = ()
    streak_freezes: int = 0  # each was bought on the morning the current streak started
    league_tier: int = 0
    promotions: tuple[int, ...] = ()  # the weeks (from joining) that ended in a promotion
    podiums: tuple[Podium, ...] = ()
    timezone: str = "Asia/Kolkata"
    hearts: int = MAX_HEARTS  # every learner starts with full hearts

    def __post_init__(self) -> None:
        if len(self.gaps) != max(0, len(self.streaks) - 1) or any(gap < 1 for gap in self.gaps):
            raise ValueError(f"{self.username}: one gap of at least a day between streaks")
        if len(self.promotions) != self.league_tier or not 0 <= self.league_tier < len(TIERS):
            raise ValueError(f"{self.username}: the promotions must lead to the league tier")
        if self.streak_freezes and not self.streaks:
            raise ValueError(f"{self.username}: freezes are bought when a streak starts")

    @property
    def daily_xp(self) -> tuple[int, ...]:
        return tuple(xp for streak in self.streaks for xp in streak)


@dataclass
class _Session:
    """One completed session of the generated history."""

    at: datetime
    day: date
    amount: int
    source: XpSource
    skill: Skill | None = None  # the path node, for path lessons and Legendary challenges


@dataclass(frozen=True)
class _Gems:
    at: datetime
    delta: int
    reason: GemReason
    ref: str | None = None


def seed_learner(session: Session, course: Course, profile: LearnerProfile, now: datetime) -> User:
    """Create one learner and their whole history, ending yesterday."""
    today = local_date(now, profile.timezone)
    streaks = _active_days(profile, today)
    days = [day for streak in streaks for day in streak]
    history = _history(profile, days, course)
    _place_path_lessons(profile, history, course)

    joined_at = (
        _at(days[0], MORNING, profile) if days else _at(today - timedelta(days=1), EVENING, profile)
    )
    user = User(
        username=profile.username,
        display_name=profile.display_name,
        avatar_color=profile.avatar_color,
        timezone=profile.timezone,
        is_bot=False,
        current_course_id=course.id,
        created_at=joined_at,
        settings=UserSettings(daily_goal_xp=profile.daily_goal_xp),
    )
    session.add(user)
    session.flush()  # assigns user.id

    first_week = week_start(local_date(joined_at, profile.timezone))
    promoted_at = [_week_end(first_week + timedelta(weeks=w), profile) for w in profile.promotions]
    podiums = _league_rewards(profile, first_week, today)
    freezes = [
        _Gems(_at(streaks[-1][0], MORNING, profile), -STREAK_FREEZE_PRICE, "streak_freeze")
        for _ in range(profile.streak_freezes)
    ]
    gems = [
        *_record_activity(session, user, profile, history),
        *_record_path_progress(session, user, course, history),
        *_record_achievements(session, user, history, streaks, promoted_at),
        *podiums,
        *freezes,
    ]
    _record_gems(session, user, profile, gems)

    session.add(
        UserStats(
            user_id=user.id,
            xp_total=sum(s.amount for s in history),
            gems=profile.gems,
            hearts=profile.hearts,
            hearts_anchor_at=None,
            streak_current=len(streaks[-1]) if streaks else 0,
            streak_longest=max((len(streak) for streak in streaks), default=0),
            streak_last_date=days[-1] if days else None,
            streak_freezes=profile.streak_freezes,
            lessons_completed=len(history),
            perfect_lessons=sum(1 for s in history if _is_perfect(s)),
            legendary_skills=sum(1 for s in history if s.source == "legendary"),
            top3_finishes=len(podiums),
            league_tier=profile.league_tier,
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


def spread_xp(
    days: int,
    total: int,
    seed: str,
    *,
    low: int = 20,
    high: int = 75,
    fixed: Mapping[int, int] | None = None,
) -> tuple[int, ...]:
    """XP for ``days`` active days that adds up to ``total``: varied, but the same every time.

    Each day earns between ``low`` and ``high``; ``fixed`` pins some days (0-based) to an
    exact amount, such as a big day with a Legendary challenge.
    """
    fixed = fixed or {}
    free = [day for day in range(days) if day not in fixed]
    remaining = total - sum(fixed.values())
    if not low * len(free) <= remaining <= high * len(free):
        raise ValueError(f"{total} XP cannot be spread over {days} days of {low}-{high} XP")
    rng = random.Random(seed)
    amounts = {day: rng.randint(low, high) for day in free}
    while (difference := remaining - sum(amounts.values())) != 0:
        day = rng.choice(free)
        step = 1 if difference > 0 else -1
        if low <= amounts[day] + step <= high:
            amounts[day] += step
    return tuple(fixed.get(day, amounts.get(day, 0)) for day in range(days))


def _active_days(profile: LearnerProfile, today: date) -> list[list[date]]:
    """The active days of each streak, oldest first; the last streak ends yesterday."""
    streaks: list[list[date]] = []
    end = today - timedelta(days=1)
    for index in reversed(range(len(profile.streaks))):
        start = end - timedelta(days=len(profile.streaks[index]) - 1)
        streaks.insert(0, [start + timedelta(days=n) for n in range(len(profile.streaks[index]))])
        if index:
            end = start - timedelta(days=profile.gaps[index - 1] + 1)
    return streaks


def _history(profile: LearnerProfile, days: Sequence[date], course: Course) -> list[_Session]:
    """Turn the daily XP into sessions: practice and reviews, plus the Legendary challenges."""
    lesson_skills = [
        skill for unit in course.units for skill in unit.skills if skill.type == "lesson"
    ]
    legendary = dict(profile.legendary)
    history: list[_Session] = []
    for number, (day, total) in enumerate(zip(days, profile.daily_xp, strict=True), start=1):
        challenge = legendary.get(number)
        awards: list[tuple[int, XpSource]] = [
            (amount, "review" if amount == REVIEW_XP else "practice")
            for amount in split_xp(total - LEGENDARY_XP if challenge is not None else total)
        ]
        if challenge is not None:
            awards.append((LEGENDARY_XP, "legendary"))  # after the day's practice
        if len(awards) > len(SESSION_TIMES):
            raise ValueError(f"{profile.username}: too many sessions on day {number}")
        for slot, (amount, source) in enumerate(awards):
            skill = (
                lesson_skills[challenge]
                if source == "legendary" and challenge is not None
                else None
            )
            history.append(
                _Session(_at(day, SESSION_TIMES[slot], profile), day, amount, source, skill)
            )
    return history


def _place_path_lessons(profile: LearnerProfile, history: list[_Session], course: Course) -> None:
    """Mark the path lessons in the history.

    The path lessons, in course order, are the earliest practice sessions, except the newest
    one: that was yesterday's last session.
    """
    if profile.path_lessons == 0:
        return
    path = [skill for unit in course.units for skill in unit.skills for _lesson in skill.lessons]
    practice = [s for s in history if s.source == "practice"]
    if (
        profile.path_lessons > len(path)
        or len(practice) < profile.path_lessons
        or history[-1].source != "practice"
    ):
        raise ValueError(f"{profile.username}: the history does not fit the path progress")
    done = path[: profile.path_lessons]
    for record, skill in zip(practice, done[:-1], strict=False):
        record.source, record.skill = "lesson", skill
    history[-1].source, history[-1].skill = "lesson", done[-1]


def _record_activity(
    session: Session, user: User, profile: LearnerProfile, history: Sequence[_Session]
) -> list[_Gems]:
    """Write the XP ledger and one activity row per day; return the goal chests opened."""
    session.add_all(
        XpEvent(user_id=user.id, source=s.source, amount=s.amount, occurred_at=s.at,
                local_date=s.day)
        for s in history
    )  # fmt: skip
    goal = profile.daily_goal_xp
    chests: list[_Gems] = []
    for day in sorted({s.day for s in history}):
        sessions = [s for s in history if s.day == day]
        totals = list(accumulate(s.amount for s in sessions))
        goal_met_at = next(
            (s.at for s, xp in zip(sessions, totals, strict=True) if xp >= goal), None
        )
        session.add(
            DailyActivity(
                user_id=user.id,
                local_date=day,
                xp=totals[-1],
                sessions_completed=len(sessions),
                goal_xp=goal,
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
    """Write the progress on each path node; return the chest rewards and Legendary entries."""
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
            if row.completed_at is None:
                raise ValueError(f"{skill.title} must be completed before its Legendary challenge")
            row.crown_level, row.legendary_at = 2, record.at
            entry_at = record.at - timedelta(minutes=1)
            gems.append(_Gems(entry_at, -LEGENDARY_ENTRY_PRICE, "legendary_entry"))
        else:
            row.lessons_completed += 1
            if row.lessons_completed == len(skill.lessons):
                row.crown_level, row.completed_at = 1, record.at

    # Each chest was opened a minute after the node before it was completed.
    nodes = [skill for unit in course.units for skill in unit.skills]
    for before, chest in pairwise(nodes):
        before_row = progress.get(before.id)
        if chest.type != "chest" or chest.chest_gems is None or before_row is None:
            continue
        if before_row.completed_at is None:
            continue
        claimed_at = before_row.completed_at + timedelta(minutes=1)
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
    streaks: Sequence[Sequence[date]],
    promoted_at: Sequence[datetime],
) -> list[_Gems]:
    """Give each achievement the level its statistic has reached, as the app computes it.

    Each level's gems are dated when the statistic first reached that level's threshold.
    Wildfire follows the best streak, as the app does, so a streak that ended still counts.
    """
    first_session: dict[date, datetime] = {}
    xp_today: dict[date, int] = {}
    daily_xp: list[tuple[datetime, int]] = []
    for s in history:
        first_session.setdefault(s.day, s.at)
        xp_today[s.day] = xp_today.get(s.day, 0) + s.amount
        daily_xp.append((s.at, xp_today[s.day]))
    times = [s.at for s in history]
    series: dict[str, list[tuple[datetime, int]]] = {
        "streak": [
            (first_session[day], n) for streak in streaks for n, day in enumerate(streak, start=1)
        ],
        "xp_total": list(zip(times, accumulate(s.amount for s in history), strict=True)),
        "perfect_lessons": list(
            zip(times, accumulate(int(_is_perfect(s)) for s in history), strict=True)
        ),
        "league_tier": _league_series(times, promoted_at),
        "daily_xp": daily_xp,
        "legendary_skills": list(
            zip(
                (s.at for s in history if s.source == "legendary"),
                accumulate(1 for s in history if s.source == "legendary"),
                strict=True,
            )
        ),
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


def _league_series(
    times: Sequence[datetime], promoted_at: Sequence[datetime]
) -> list[tuple[datetime, int]]:
    """The highest league reached, as tier + 1, from the session that unlocked the leaderboard."""
    if len(times) < LEADERBOARD_UNLOCK_LESSONS:
        return []  # leagues are still locked
    unlocked_at = times[LEADERBOARD_UNLOCK_LESSONS - 1]
    tier_then = sum(1 for at in promoted_at if at <= unlocked_at)
    later = [at for at in promoted_at if at > unlocked_at]
    return [(unlocked_at, tier_then + 1)] + [
        (at, tier_then + step + 1) for step, at in enumerate(later, start=1)
    ]


def _league_rewards(profile: LearnerProfile, first_week: date, today: date) -> list[_Gems]:
    """The prizes for the profile's podium finishes, each paid when its week ended."""
    rewards = []
    for podium in profile.podiums:
        anchor = first_week if podium.week >= 0 else week_start(today)
        week = anchor + timedelta(weeks=podium.week)
        prize = reward_gems(podium.rank, podium.tier)
        rewards.append(_Gems(_week_end(week, profile), prize, "league_reward", f"league:{week}"))
    return rewards


def _record_gems(
    session: Session, user: User, profile: LearnerProfile, gems: Sequence[_Gems]
) -> None:
    """Write the gem ledger in time order with running balances, after an opening grant."""
    opening = profile.gems - sum(entry.delta for entry in gems)
    if opening <= 0:
        raise ValueError(f"{profile.username}: the history spends more gems than the balance")
    balance = 0
    for entry in [_Gems(user.created_at, opening, "seed"), *sorted(gems, key=lambda g: g.at)]:
        balance += entry.delta
        if balance < 0:
            raise ValueError(f"{profile.username}: the gem balance would go below zero")
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


def _is_perfect(record: _Session) -> bool:
    return record.source in ("lesson", "practice") and record.amount == PERFECT_XP


def _week_end(week: date, profile: LearnerProfile) -> datetime:
    """The instant the league week starting on ``week`` ends, in the learner's time zone."""
    return local_midnight_utc(week + timedelta(weeks=1), profile.timezone)


def _at(day: date, clock_time: time, profile: LearnerProfile) -> datetime:
    """A local time on ``day`` in the learner's time zone, as a UTC instant."""
    return datetime.combine(day, clock_time, tzinfo=ZoneInfo(profile.timezone)).astimezone(UTC)
