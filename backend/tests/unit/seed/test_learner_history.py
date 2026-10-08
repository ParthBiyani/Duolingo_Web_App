"""The building blocks of the default learner's generated history."""

import pytest

from app.seed.learner import CURRENT_STREAK_XP, LEGENDARY_DAY, PAST_STREAK_XP, split_xp


def test_split_xp_makes_lesson_sized_awards() -> None:
    for total in range(10, 100):
        awards = split_xp(total)
        assert sum(awards) == total
        assert all(10 <= award <= 15 for award in awards if award != 5)
        assert awards.count(5) <= 1  # at most one 5 XP review a day


def test_split_xp_needs_room_for_one_lesson() -> None:
    with pytest.raises(ValueError, match="at least 10"):
        split_xp(9)


def test_history_matches_the_plan() -> None:
    daily = PAST_STREAK_XP + CURRENT_STREAK_XP
    assert (len(PAST_STREAK_XP), len(CURRENT_STREAK_XP)) == (21, 12)
    assert sum(daily) == 1240
    assert min(daily) >= 10
    assert max(daily) == daily[LEGENDARY_DAY - 1] == 85  # the best day had the Legendary
