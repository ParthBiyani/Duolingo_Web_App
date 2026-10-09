"""Helpers shared by the services: lazy settlement, ledgers and small conversions."""

import json
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.domain import dates
from app.domain.hearts import HeartsState, next_heart_at, settle_hearts
from app.domain.streak import StreakState, settle_streak
from app.models import Course, DailyActivity, GemTransaction, User, UserStats, XpEvent
from app.schemas.common import CourseRef, DayStatus, StreakDay, UserRef

WEEKDAY_LABELS = ("M", "Tu", "W", "Th", "F", "Sa", "Su")


# --- conversions --------------------------------------------------------------------------------


def as_date(value: date | str | None) -> date | None:
    """Read a local-date column, whichever Python type the model maps it to."""
    if value is None or isinstance(value, date):
        return value
    return date.fromisoformat(value)


def date_text(day: date) -> str:
    return day.isoformat()


def load_json(value: Any) -> Any:
    """Read a JSON column, whichever Python type the model maps it to."""
    return json.loads(value) if isinstance(value, str) else value


def today_for(user: User, now: datetime) -> date:
    return dates.local_date(now, user.timezone)


def course_ref(course: Course) -> CourseRef:
    return CourseRef(
        id=course.id,
        title=course.title,
        learning_language=course.learning_language,
        from_language=course.from_language,
    )


def user_ref(user: User) -> UserRef:
    return UserRef(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        avatar_color=user.avatar_color,
        timezone=user.timezone,
        joined_at=user.created_at,
    )


def current_course(db: Session, user: User) -> Course:
    course = db.get(Course, user.current_course_id) if user.current_course_id else None
    if course is None:
        course = db.scalar(select(Course).where(Course.is_available.is_(True)).order_by(Course.id))
    if course is None:
        raise AppError(503, "not_seeded", "Not ready", "No course has been seeded yet.")
    return course


# --- hearts and streak --------------------------------------------------------------------------


def hearts_state(stats: UserStats) -> HeartsState:
    return HeartsState(stats.hearts, stats.hearts_anchor_at)


def apply_hearts(stats: UserStats, state: HeartsState) -> None:
    stats.hearts = state.hearts
    stats.hearts_anchor_at = state.anchor


def next_heart(stats: UserStats) -> datetime | None:
    return next_heart_at(hearts_state(stats))


def streak_state(stats: UserStats) -> StreakState:
    return StreakState(
        current=stats.streak_current,
        longest=stats.streak_longest,
        last_date=as_date(stats.streak_last_date),
        freezes=stats.streak_freezes,
    )


def apply_streak(stats: UserStats, state: StreakState) -> None:
    stats.streak_current = state.current
    stats.streak_longest = state.longest
    stats.streak_last_date = state.last_date
    stats.streak_freezes = state.freezes


def settle(db: Session, user: User, now: datetime) -> UserStats:
    """Bring time-based state up to ``now``: regenerated hearts and missed streak days.

    Called at the start of every request that reads or changes a learner, so the stored state
    is always current without background jobs (docs/adr/0004).
    """
    stats = user.stats
    apply_hearts(stats, settle_hearts(hearts_state(stats), now))
    settled = settle_streak(streak_state(stats), today_for(user, now))
    if settled.frozen_dates or settled.broken:
        apply_streak(stats, settled.state)
        for day in settled.frozen_dates:
            activity_for(db, user, day).streak_status = "frozen"
    return stats


# --- daily activity and ledgers -----------------------------------------------------------------


def activity_for(db: Session, user: User, day: date) -> DailyActivity:
    """Return the learner's activity row for a local day, creating it on first use."""
    activity = db.get(DailyActivity, (user.id, day))
    if activity is None:
        activity = DailyActivity(
            user_id=user.id,
            local_date=day,
            xp=0,
            sessions_completed=0,
            goal_xp=user.settings.daily_goal_xp,
            streak_status="none",
        )
        db.add(activity)
        db.flush()
    return activity


def add_xp(
    db: Session,
    user: User,
    amount: int,
    source: str,
    now: datetime,
    session_id: str | None = None,
) -> DailyActivity:
    """Record an XP award in the ledger and update the cached totals in the same transaction."""
    day = today_for(user, now)
    activity = activity_for(db, user, day)
    if amount > 0:
        db.add(
            XpEvent(
                user_id=user.id,
                session_id=session_id,
                source=source,
                amount=amount,
                occurred_at=now,
                local_date=day,
            )
        )
        user.stats.xp_total += amount
        activity.xp += amount
    return activity


def add_gems(
    db: Session, user: User, delta: int, reason: str, now: datetime, ref: str | None = None
) -> bool:
    """Record a gem change. Returns False when a one-off reward (same ``ref``) was already paid."""
    if ref is not None:
        paid = db.scalar(
            select(GemTransaction.id).where(
                GemTransaction.user_id == user.id,
                GemTransaction.reason == reason,
                GemTransaction.ref == ref,
            )
        )
        if paid is not None:
            return False
    balance = user.stats.gems + delta
    if balance < 0:
        raise AppError(409, "insufficient_gems", "Not enough gems", "You need more gems for that.")
    db.add(
        GemTransaction(
            user_id=user.id,
            delta=delta,
            reason=reason,
            ref=ref,
            balance_after=balance,
            created_at=now,
        )
    )
    user.stats.gems = balance
    return True


# --- streak days ---------------------------------------------------------------------------------


def streak_statuses(db: Session, user: User, days: list[date], today: date) -> list[DayStatus]:
    """Each day's streak status as the learner sees it on ``today``, in the order given."""
    rows = db.scalars(
        select(DailyActivity).where(
            DailyActivity.user_id == user.id,
            DailyActivity.local_date.in_(days),
        )
    ).all()
    status_by_day = {as_date(row.local_date): row.streak_status for row in rows}
    statuses: list[DayStatus] = []
    for day in days:
        stored = status_by_day.get(day, "none")
        status: DayStatus
        if stored == "extended":
            status = "extended"
        elif stored == "frozen":
            status = "frozen"
        elif day == today:
            status = "pending"
        elif day > today:
            status = "future"
        else:
            status = "missed"
        statuses.append(status)
    return statuses


def streak_week(db: Session, user: User, now: datetime) -> list[StreakDay]:
    """The current Monday-to-Sunday week with each day's streak status."""
    today = today_for(user, now)
    start = dates.week_start(today)
    days = [start + timedelta(days=offset) for offset in range(7)]
    statuses = streak_statuses(db, user, days, today)
    return [
        StreakDay(date=date_text(day), label=WEEKDAY_LABELS[day.weekday()], status=status)
        for day, status in zip(days, statuses, strict=True)
    ]
