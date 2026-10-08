from datetime import UTC, date, datetime, timedelta

import pytest

from app.domain.dates import local_date
from app.domain.streak import (
    MAX_FREEZES,
    MILESTONES,
    StreakCredit,
    StreakSettle,
    StreakState,
    credit_streak,
    settle_streak,
)

TODAY = date(2026, 10, 9)
IST = "Asia/Kolkata"


def days_ago(days: int) -> date:
    return TODAY - timedelta(days=days)


def test_rules() -> None:
    assert MILESTONES == (7, 30, 50, 100, 365)
    assert MAX_FREEZES == 2


# Settling missed days


@pytest.mark.parametrize("last_date", [TODAY, days_ago(1)], ids=["today", "yesterday"])
def test_nothing_to_settle_without_a_missed_day(last_date: date) -> None:
    state = StreakState(current=5, longest=10, last_date=last_date, freezes=1)
    assert settle_streak(state, TODAY) == StreakSettle(state, frozen_dates=(), broken=False)


@pytest.mark.parametrize(
    "state",
    [
        pytest.param(
            StreakState(current=0, longest=10, last_date=days_ago(9), freezes=2), id="lost"
        ),
        pytest.param(
            StreakState(current=0, longest=0, last_date=None, freezes=1), id="never-started"
        ),
    ],
)
def test_freezes_are_not_spent_without_a_streak(state: StreakState) -> None:
    assert settle_streak(state, TODAY) == StreakSettle(state, frozen_dates=(), broken=False)


def test_one_missed_day_is_covered_by_a_freeze() -> None:
    state = StreakState(current=5, longest=10, last_date=days_ago(2), freezes=1)
    assert settle_streak(state, TODAY) == StreakSettle(
        StreakState(current=5, longest=10, last_date=days_ago(1), freezes=0),
        frozen_dates=(days_ago(1),),
        broken=False,
    )


def test_two_missed_days_spend_two_freezes_oldest_first() -> None:
    state = StreakState(current=5, longest=10, last_date=days_ago(3), freezes=2)
    assert settle_streak(state, TODAY) == StreakSettle(
        StreakState(current=5, longest=10, last_date=days_ago(1), freezes=0),
        frozen_dates=(days_ago(2), days_ago(1)),
        broken=False,
    )


def test_freezes_that_are_not_needed_are_kept() -> None:
    state = StreakState(current=5, longest=10, last_date=days_ago(2), freezes=2)
    assert settle_streak(state, TODAY).state.freezes == 1


def test_two_missed_days_with_one_freeze_break_the_streak() -> None:
    state = StreakState(current=5, longest=10, last_date=days_ago(3), freezes=1)
    assert settle_streak(state, TODAY) == StreakSettle(
        StreakState(current=0, longest=10, last_date=days_ago(3), freezes=0),
        frozen_dates=(days_ago(2),),
        broken=True,
    )


def test_a_missed_day_without_freezes_breaks_the_streak() -> None:
    state = StreakState(current=5, longest=10, last_date=days_ago(2), freezes=0)
    assert settle_streak(state, TODAY) == StreakSettle(
        StreakState(current=0, longest=10, last_date=days_ago(2), freezes=0),
        frozen_dates=(),
        broken=True,
    )


@pytest.mark.parametrize("freezes", [0, 1, 2])
def test_settling_again_on_the_same_day_changes_nothing(freezes: int) -> None:
    state = StreakState(current=5, longest=10, last_date=days_ago(2), freezes=freezes)
    first = settle_streak(state, TODAY)
    assert settle_streak(first.state, TODAY) == StreakSettle(
        first.state, frozen_dates=(), broken=False
    )


# Crediting a completed session


def test_the_first_session_ever_starts_a_streak() -> None:
    result = credit_streak(StreakState(current=0, longest=0, last_date=None, freezes=0), TODAY)
    assert result == StreakCredit(
        StreakState(current=1, longest=1, last_date=TODAY, freezes=0),
        extended=True,
        milestone=False,
    )


def test_practising_on_consecutive_days_extends_the_streak() -> None:
    state = StreakState(current=5, longest=10, last_date=days_ago(1), freezes=1)
    assert credit_streak(state, TODAY) == StreakCredit(
        StreakState(current=6, longest=10, last_date=TODAY, freezes=1),
        extended=True,
        milestone=False,
    )


def test_a_second_session_on_the_same_day_does_not_count_again() -> None:
    first = credit_streak(
        StreakState(current=5, longest=10, last_date=days_ago(1), freezes=0), TODAY
    )
    second = credit_streak(first.state, TODAY)
    assert second == StreakCredit(first.state, extended=False, milestone=False)
    assert second.state.current == 6


def test_the_longest_streak_grows_with_the_current_one() -> None:
    state = StreakState(current=10, longest=10, last_date=days_ago(1), freezes=0)
    assert credit_streak(state, TODAY).state.longest == 11


def test_a_frozen_day_keeps_the_streak_without_adding_to_it() -> None:
    settled = settle_streak(
        StreakState(current=5, longest=10, last_date=days_ago(2), freezes=1), TODAY
    )
    assert credit_streak(settled.state, TODAY).state == StreakState(
        current=6, longest=10, last_date=TODAY, freezes=0
    )


def test_a_broken_streak_starts_again_at_one() -> None:
    settled = settle_streak(
        StreakState(current=5, longest=10, last_date=days_ago(3), freezes=0), TODAY
    )
    result = credit_streak(settled.state, TODAY)
    assert result.extended
    assert result.state == StreakState(current=1, longest=10, last_date=TODAY, freezes=0)


@pytest.mark.parametrize("milestone", MILESTONES)
def test_reaching_a_milestone_is_flagged_once(milestone: int) -> None:
    reaching = StreakState(
        current=milestone - 1, longest=milestone - 1, last_date=days_ago(1), freezes=0
    )
    result = credit_streak(reaching, TODAY)
    assert result.state.current == milestone
    assert result.milestone

    passing = StreakState(current=milestone, longest=milestone, last_date=days_ago(1), freezes=0)
    assert not credit_streak(passing, TODAY).milestone


def test_a_last_date_after_today_is_not_credited_again() -> None:
    # Only possible when the clock moves backwards, e.g. after resetting the demo clock.
    state = StreakState(current=5, longest=10, last_date=TODAY + timedelta(days=1), freezes=0)
    assert credit_streak(state, TODAY) == StreakCredit(state, extended=False, milestone=False)


@pytest.mark.parametrize(("tz", "expected"), [(IST, 5), ("UTC", 4)], ids=["ist", "utc"])
def test_local_midnight_decides_which_day_a_session_counts_for(tz: str, expected: int) -> None:
    # 18:29 and 18:31 UTC are 23:59 and 00:01 in India: two days there, one day in UTC.
    sessions = [
        datetime(2026, 10, 8, 18, 29, tzinfo=UTC),
        datetime(2026, 10, 8, 18, 31, tzinfo=UTC),
    ]
    state = StreakState(current=3, longest=3, last_date=date(2026, 10, 7), freezes=0)
    for finished_at in sessions:
        today = local_date(finished_at, tz)
        state = credit_streak(settle_streak(state, today).state, today).state
    assert state.current == expected
