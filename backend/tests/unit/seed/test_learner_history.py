"""The building blocks of the sample learners' generated histories."""

from datetime import UTC, datetime, timedelta

import pytest

from app.seed.learner import LearnerProfile, _league_series, split_xp, spread_xp
from app.seed.learners import ISHA, KABIR, LEARNERS, PARTH, ZOE


def test_split_xp_makes_lesson_sized_awards() -> None:
    for total in range(10, 100):
        awards = split_xp(total)
        assert sum(awards) == total
        assert all(10 <= award <= 15 for award in awards if award != 5)
        assert awards.count(5) <= 1  # at most one 5 XP review a day


def test_split_xp_needs_room_for_one_lesson() -> None:
    with pytest.raises(ValueError, match="at least 10"):
        split_xp(9)


def test_spread_xp_hits_the_total_within_bounds_and_repeats() -> None:
    amounts = spread_xp(30, 1_200, "test", low=20, high=60, fixed={4: 90})
    assert len(amounts) == 30
    assert sum(amounts) == 1_200
    assert amounts[4] == 90
    assert all(20 <= amount <= 60 for day, amount in enumerate(amounts) if day != 4)
    assert spread_xp(30, 1_200, "test", low=20, high=60, fixed={4: 90}) == amounts


def test_spread_xp_rejects_an_impossible_total() -> None:
    with pytest.raises(ValueError, match="cannot be spread"):
        spread_xp(10, 1_000, "test", low=20, high=75)


def test_parths_history_matches_the_plan() -> None:
    past, current = PARTH.streaks
    assert (len(past), len(current), PARTH.gaps) == (21, 12, (17,))
    assert sum(PARTH.daily_xp) == 1240
    assert min(PARTH.daily_xp) >= 10
    legendary_day, skill = PARTH.legendary[0]
    assert skill == 0  # Greetings
    assert max(PARTH.daily_xp) == PARTH.daily_xp[legendary_day - 1] == 85  # the best day


def test_the_learners_are_at_different_stages() -> None:
    assert [profile.username for profile in LEARNERS] == [
        "parthbiyani",
        "ananyaiyer",
        "ishanair",
        "kabirmalhotra",
    ]
    assert len({profile.avatar_color for profile in LEARNERS}) == len(LEARNERS)
    assert (ZOE.streaks, ZOE.path_lessons, ZOE.league_tier) == ((), 0, 0)
    assert (sum(ISHA.daily_xp), len(ISHA.streaks[-1]), ISHA.path_lessons) == (205, 4, 7)
    assert (sum(KABIR.daily_xp), len(KABIR.streaks[-1]), KABIR.league_tier) == (4120, 64, 1)
    assert {PARTH.league_tier, ISHA.league_tier, KABIR.league_tier} == {1}  # one Silver cohort
    assert len(KABIR.legendary) == 2


def test_champion_follows_the_highest_league_reached() -> None:
    sessions = [datetime(2026, 7, 1, tzinfo=UTC) + timedelta(hours=n) for n in range(12)]
    unlocked = sessions[9]  # the tenth session unlocks the leaderboard
    week = timedelta(weeks=1)
    moves = [(unlocked - week, 1), (unlocked + week, 1), (unlocked + 2 * week, -1)]
    assert _league_series(sessions, moves) == [(unlocked, 2), (unlocked + week, 3)]
    assert _league_series(sessions[:9], moves) == []  # still locked


def test_a_profile_must_be_consistent() -> None:
    with pytest.raises(ValueError, match="gap"):
        LearnerProfile("someone", "Some One", "#58CC02", 20, gems=10, streaks=((20,), (20,)))
    with pytest.raises(ValueError, match="league tier"):
        LearnerProfile("someone", "Some One", "#58CC02", 20, gems=10, league_tier=1)
    with pytest.raises(ValueError, match="league tier"):
        LearnerProfile(
            "someone", "Some One", "#58CC02", 20, gems=10, league_tier=1, promotions=(0,),
            demotions=(1,),
        )  # fmt: skip
    with pytest.raises(ValueError, match="freezes"):
        LearnerProfile("someone", "Some One", "#58CC02", 20, gems=10, streak_freezes=1)
