"""The streak calendar: one month of streak days with the learner's streak and next goal."""

import calendar
from datetime import date, datetime

from sqlalchemy.orm import Session

from app.domain import dates
from app.domain.streak import streak_goal
from app.models import User
from app.schemas.streak import CalendarDay, StreakCalendarResponse, StreakGoalView
from app.services.common import date_text, settle, streak_statuses, today_for


def month_text(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


def month_days(month: str) -> list[date]:
    """Every day of a ``YYYY-MM`` month."""
    year, number = (int(part) for part in month.split("-"))
    length = calendar.monthrange(year, number)[1]
    return [date(year, number, day) for day in range(1, length + 1)]


def get_calendar(
    db: Session, now: datetime, user: User, month: str | None = None
) -> StreakCalendarResponse:
    """The days of ``month`` (default: the learner's current month) with their streak status."""
    stats = settle(db, user, now)
    today = today_for(user, now)
    shown = month or month_text(today)
    days = month_days(shown)
    statuses = streak_statuses(db, user, days, today)
    extended_today = streak_statuses(db, user, [today], today)[0] == "extended"
    goal = streak_goal(stats.streak_current)
    response = StreakCalendarResponse(
        month=shown,
        today=date_text(today),
        first_month=month_text(dates.local_date(user.created_at, user.timezone)),
        current=stats.streak_current,
        longest=stats.streak_longest,
        extended_today=extended_today,
        freezes=stats.streak_freezes,
        goal=StreakGoalView(start=goal.start, target=goal.target),
        days=[
            CalendarDay(date=date_text(day), status=status)
            for day, status in zip(days, statuses, strict=True)
        ],
    )
    db.commit()
    return response
