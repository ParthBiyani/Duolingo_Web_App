from datetime import UTC, datetime, timedelta

import pytest

from app.domain.hearts import (
    MAX_HEARTS,
    REGEN,
    HeartsState,
    gain_heart,
    lose_heart,
    next_heart_at,
    refill_hearts,
    settle_hearts,
)

T0 = datetime(2026, 10, 9, 9, 0, tzinfo=UTC)
FULL = HeartsState(MAX_HEARTS, None)


def lose(state: HeartsState, times: int, now: datetime) -> HeartsState:
    for _ in range(times):
        state = lose_heart(state, now)
    return state


@pytest.mark.parametrize(
    ("hearts", "anchor"),
    [
        pytest.param(6, None, id="above-maximum"),
        pytest.param(-1, T0, id="negative"),
        pytest.param(4, None, id="missing-without-anchor"),
        pytest.param(5, T0, id="full-with-anchor"),
    ],
)
def test_impossible_states_are_rejected(hearts: int, anchor: datetime | None) -> None:
    with pytest.raises(ValueError):
        HeartsState(hearts, anchor)


def test_losing_a_heart_from_full_starts_the_clock() -> None:
    assert lose_heart(FULL, T0) == HeartsState(4, T0)


def test_a_lost_heart_comes_back_after_exactly_five_hours() -> None:
    state = lose_heart(FULL, T0)
    assert next_heart_at(state) == T0 + timedelta(hours=5)
    assert settle_hearts(state, T0 + timedelta(hours=4, minutes=59)) == HeartsState(4, T0)
    assert settle_hearts(state, T0 + timedelta(hours=5)) == FULL


def test_all_five_hearts_come_back_after_twenty_five_hours() -> None:
    empty = lose(FULL, 5, T0)
    assert empty == HeartsState(0, T0)
    almost = settle_hearts(empty, T0 + timedelta(hours=24, minutes=59))
    assert almost == HeartsState(4, T0 + 4 * REGEN)
    assert settle_hearts(empty, T0 + timedelta(hours=25)) == FULL


@pytest.mark.parametrize(
    ("elapsed", "expected"),
    [
        pytest.param(timedelta(0), HeartsState(0, T0), id="0h"),
        pytest.param(
            timedelta(hours=5) - timedelta(seconds=1), HeartsState(0, T0), id="5h-minus-1s"
        ),
        pytest.param(timedelta(hours=5), HeartsState(1, T0 + REGEN), id="5h"),
        pytest.param(timedelta(hours=7), HeartsState(1, T0 + REGEN), id="7h"),
        pytest.param(timedelta(hours=10), HeartsState(2, T0 + 2 * REGEN), id="10h"),
        pytest.param(timedelta(hours=24), HeartsState(4, T0 + 4 * REGEN), id="24h"),
        pytest.param(timedelta(hours=25), FULL, id="25h"),
        pytest.param(timedelta(days=30), FULL, id="30d"),
    ],
)
def test_regeneration_from_empty(elapsed: timedelta, expected: HeartsState) -> None:
    assert settle_hearts(HeartsState(0, T0), T0 + elapsed) == expected


def test_the_anchor_moves_by_whole_intervals_only() -> None:
    state = settle_hearts(HeartsState(2, T0), T0 + timedelta(hours=7))
    assert state == HeartsState(3, T0 + REGEN)
    # The two hours already waited still count towards the next heart.
    assert next_heart_at(state) == T0 + 2 * REGEN


def test_the_anchor_is_kept_across_further_losses() -> None:
    state = lose_heart(FULL, T0)
    state = lose_heart(state, T0 + timedelta(hours=1))
    state = lose_heart(state, T0 + timedelta(hours=2))
    assert state == HeartsState(2, T0)
    assert next_heart_at(state) == T0 + REGEN
    assert settle_hearts(state, T0 + REGEN) == HeartsState(3, T0 + REGEN)


def test_losing_a_heart_settles_regeneration_first() -> None:
    later = T0 + timedelta(hours=6)
    # Back to full by the time of the mistake, so the clock restarts at the mistake.
    assert lose_heart(HeartsState(4, T0), later) == HeartsState(4, later)
    # One heart came back at T0 + 5h and one is lost: the clock keeps its 5-hour rhythm.
    assert lose_heart(HeartsState(3, T0), later) == HeartsState(3, T0 + REGEN)


def test_hearts_never_go_below_zero() -> None:
    assert lose_heart(HeartsState(0, T0), T0 + timedelta(hours=1)) == HeartsState(0, T0)


def test_settling_full_hearts_changes_nothing() -> None:
    assert settle_hearts(FULL, T0 + timedelta(days=3)) == FULL
    assert next_heart_at(FULL) is None


def test_a_clock_that_moved_back_takes_no_hearts() -> None:
    state = HeartsState(3, T0)
    assert settle_hearts(state, T0 - timedelta(hours=6)) == state


def test_gaining_a_heart_keeps_the_regeneration_clock() -> None:
    assert gain_heart(HeartsState(2, T0), T0 + timedelta(hours=1)) == HeartsState(3, T0)


def test_gaining_the_last_missing_heart_stops_the_clock() -> None:
    assert gain_heart(HeartsState(4, T0), T0 + timedelta(hours=1)) == FULL


def test_gaining_a_heart_when_full_stays_full() -> None:
    assert gain_heart(FULL, T0) == FULL


def test_gaining_a_heart_settles_regeneration_first() -> None:
    # Three hearts, one regenerated at T0 + 5h, plus the practice reward: full.
    assert gain_heart(HeartsState(3, T0), T0 + timedelta(hours=5)) == FULL


def test_refill_fills_every_heart() -> None:
    assert refill_hearts() == FULL
