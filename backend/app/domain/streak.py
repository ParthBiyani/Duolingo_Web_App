"""Daily streak: settled lazily for missed days, extended by the first session of a day.

All dates are local calendar dates in the learner's time zone (see ``dates.local_date``).
"""

from dataclasses import dataclass, replace
from datetime import date, timedelta

MILESTONES = (7, 30, 50, 100, 365)
MAX_FREEZES = 2  # streak freezes a learner can hold at once

_ONE_DAY = timedelta(days=1)


@dataclass(frozen=True)
class StreakState:
    current: int
    longest: int
    last_date: date | None  # last day the streak was extended, or kept alive by freezes
    freezes: int


@dataclass(frozen=True)
class StreakSettle:
    state: StreakState
    frozen_dates: tuple[date, ...]  # missed days a freeze was spent on, oldest first
    broken: bool  # the streak reset to 0 because the freezes ran out


@dataclass(frozen=True)
class StreakCredit:
    state: StreakState
    extended: bool  # this was the day's first session, so the streak grew
    milestone: bool  # the new length is one of MILESTONES


def settle_streak(s: StreakState, today: date) -> StreakSettle:
    """Account for the days missed between the last streak day and ``today``.

    Each missed day spends one freeze, oldest day first. If the freezes run out, the streak
    resets to 0 and the freezes already spent stay spent, just as they would have been used
    up overnight. Settling again on the same day changes nothing.
    """
    if s.current == 0 or s.last_date is None:
        return StreakSettle(s, frozen_dates=(), broken=False)
    missed = (today - s.last_date).days - 1
    if missed <= 0:
        return StreakSettle(s, frozen_dates=(), broken=False)
    spent = min(missed, s.freezes)
    frozen = tuple(s.last_date + _ONE_DAY * offset for offset in range(1, spent + 1))
    if spent == missed:
        kept = replace(s, last_date=today - _ONE_DAY, freezes=s.freezes - spent)
        return StreakSettle(kept, frozen_dates=frozen, broken=False)
    reset = replace(s, current=0, freezes=s.freezes - spent)
    return StreakSettle(reset, frozen_dates=frozen, broken=True)


def credit_streak(s: StreakState, today: date) -> StreakCredit:
    """Count a completed session on ``today``. Call after ``settle_streak``.

    Only the first session of a local day extends the streak. Once settled, the streak is
    either alive up to yesterday, so it continues, or it is over and a new one starts at 1.
    """
    if s.last_date is not None and s.last_date >= today:
        return StreakCredit(s, extended=False, milestone=False)
    current = s.current + 1 if s.last_date == today - _ONE_DAY else 1
    state = StreakState(
        current=current,
        longest=max(s.longest, current),
        last_date=today,
        freezes=s.freezes,
    )
    return StreakCredit(state, extended=True, milestone=current in MILESTONES)
