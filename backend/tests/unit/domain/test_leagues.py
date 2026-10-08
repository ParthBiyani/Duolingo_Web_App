import random
from datetime import UTC, date, datetime, timedelta
from itertools import pairwise

import pytest

from app.domain.leagues import (
    COHORT_SIZE,
    TIERS,
    LeagueOutcome,
    LeagueTier,
    Ranked,
    Standing,
    bot_day_xp,
    get_tier,
    outcome_for,
    rank_standings,
    reward_gems,
)

WEEK_START = datetime(2026, 10, 4, 18, 30, tzinfo=UTC)  # Monday 00:00 in India


def standing(user_id: int, xp: int, minutes: int = 0) -> Standing:
    """A row whose weekly total was reached ``minutes`` into the week."""
    return Standing(user_id=user_id, xp=xp, reached_at=WEEK_START + timedelta(minutes=minutes))


def full_cohort() -> list[Standing]:
    """Thirty rows with distinct XP, in rank order: user 1 leads and user 30 is last."""
    return [standing(user_id, xp=1000 - 10 * user_id) for user_id in range(1, COHORT_SIZE + 1)]


def test_tier_table() -> None:
    assert [(t.tier, t.name, t.color, t.promote, t.demote) for t in TIERS] == [
        (0, "Bronze", "#CD7F32", 20, 0),
        (1, "Silver", "#C0C0C0", 15, 5),
        (2, "Gold", "#FFC800", 10, 5),
        (3, "Sapphire", "#1CB0F6", 7, 5),
        (4, "Ruby", "#FF4B4B", 7, 5),
        (5, "Emerald", "#58CC02", 7, 5),
        (6, "Amethyst", "#CE82FF", 7, 5),
        (7, "Pearl", "#FFB6C1", 7, 5),
        (8, "Obsidian", "#4B4B4B", 5, 5),
        (9, "Diamond", "#49C0F8", 0, 5),
    ]
    assert COHORT_SIZE == 30


def test_prizes_shrink_down_the_podium_and_grow_with_each_league() -> None:
    assert TIERS[0].rewards == (20, 10, 5)
    assert TIERS[-1].rewards == (75, 60, 50)
    for league in TIERS:
        first, second, third = league.rewards
        assert first > second > third > 0
    for lower, higher in pairwise(TIERS):
        assert all(low < high for low, high in zip(lower.rewards, higher.rewards, strict=True)), (
            f"{higher.name} should pay more than {lower.name}"
        )


def test_get_tier() -> None:
    assert get_tier(0) is TIERS[0]
    assert get_tier(9).name == "Diamond"


@pytest.mark.parametrize("tier", [-1, 10])
def test_unknown_tiers_are_rejected(tier: int) -> None:
    with pytest.raises(ValueError, match="unknown league tier"):
        get_tier(tier)


# Ranking


def test_ranking_orders_by_weekly_xp() -> None:
    rows = [standing(1, 120), standing(2, 340), standing(3, 95)]
    assert rank_standings(rows, tier=1) == [
        Ranked(user_id=2, xp=340, rank=1, zone="promotion"),
        Ranked(user_id=1, xp=120, rank=2, zone="promotion"),
        Ranked(user_id=3, xp=95, rank=3, zone="promotion"),
    ]


def test_equal_xp_goes_to_whoever_reached_it_first() -> None:
    rows = [
        standing(1, 200, minutes=90),
        standing(2, 200, minutes=30),
        standing(3, 200, minutes=60),
    ]
    assert [row.user_id for row in rank_standings(rows, tier=1)] == [2, 3, 1]


def test_a_complete_tie_falls_back_to_user_id() -> None:
    rows = [standing(9, 50), standing(4, 50), standing(6, 50)]
    assert [row.user_id for row in rank_standings(rows, tier=1)] == [4, 6, 9]


def test_ranking_does_not_depend_on_input_order() -> None:
    shuffled = full_cohort()
    random.Random(7).shuffle(shuffled)
    assert rank_standings(shuffled, tier=3) == rank_standings(full_cohort(), tier=3)


def test_an_empty_cohort_has_no_rows() -> None:
    assert rank_standings([], tier=0) == []


@pytest.mark.parametrize("league", TIERS, ids=lambda league: league.name)
def test_zones_in_a_full_cohort(league: LeagueTier) -> None:
    safe = COHORT_SIZE - league.promote - league.demote
    expected = ["promotion"] * league.promote + ["safe"] * safe + ["demotion"] * league.demote
    assert [row.zone for row in rank_standings(full_cohort(), league.tier)] == expected


def test_promotion_wins_in_a_cohort_too_small_for_both_zones() -> None:
    rows = [standing(1, 30), standing(2, 20), standing(3, 10)]
    assert [row.zone for row in rank_standings(rows, tier=1)] == ["promotion"] * 3
    assert outcome_for(3, tier=1, size=3) == "promoted"


# End-of-week outcomes and rewards


@pytest.mark.parametrize(
    ("tier", "rank", "outcome"),
    [
        pytest.param(0, 1, "promoted", id="bronze-1st"),
        pytest.param(0, 20, "promoted", id="bronze-20th"),
        pytest.param(0, 21, "stayed", id="bronze-21st"),
        pytest.param(0, 30, "stayed", id="bronze-last-is-never-demoted"),
        pytest.param(1, 15, "promoted", id="silver-15th"),
        pytest.param(1, 16, "stayed", id="silver-16th"),
        pytest.param(1, 25, "stayed", id="silver-25th"),
        pytest.param(1, 26, "demoted", id="silver-26th"),
        pytest.param(2, 10, "promoted", id="gold-10th"),
        pytest.param(2, 11, "stayed", id="gold-11th"),
        pytest.param(5, 7, "promoted", id="emerald-7th"),
        pytest.param(5, 8, "stayed", id="emerald-8th"),
        pytest.param(8, 5, "promoted", id="obsidian-5th"),
        pytest.param(8, 6, "stayed", id="obsidian-6th"),
        pytest.param(9, 1, "stayed", id="diamond-1st-is-never-promoted"),
        pytest.param(9, 25, "stayed", id="diamond-25th"),
        pytest.param(9, 26, "demoted", id="diamond-26th"),
        pytest.param(9, 30, "demoted", id="diamond-30th"),
    ],
)
def test_outcome_for(tier: int, rank: int, outcome: LeagueOutcome) -> None:
    assert outcome_for(rank, tier, COHORT_SIZE) == outcome


@pytest.mark.parametrize("league", TIERS, ids=lambda league: league.name)
def test_outcomes_match_the_zones_shown_during_the_week(league: LeagueTier) -> None:
    outcome_by_zone = {"promotion": "promoted", "safe": "stayed", "demotion": "demoted"}
    for row in rank_standings(full_cohort(), league.tier):
        assert outcome_for(row.rank, league.tier, COHORT_SIZE) == outcome_by_zone[row.zone]


@pytest.mark.parametrize(
    ("rank", "tier", "size"),
    [
        pytest.param(0, 1, 30, id="rank-zero"),
        pytest.param(31, 1, 30, id="rank-past-cohort"),
        pytest.param(1, 10, 30, id="unknown-tier"),
    ],
)
def test_outcome_for_rejects_impossible_input(rank: int, tier: int, size: int) -> None:
    with pytest.raises(ValueError):
        outcome_for(rank, tier, size)


@pytest.mark.parametrize(
    ("tier", "rank", "gems"),
    [
        (0, 1, 20),
        (0, 2, 10),
        (0, 3, 5),
        (0, 4, 0),
        (4, 2, 30),
        (9, 1, 75),
        (9, 3, 50),
        (9, 30, 0),
    ],
)
def test_reward_gems(tier: int, rank: int, gems: int) -> None:
    assert reward_gems(rank, tier) == gems


@pytest.mark.parametrize(("rank", "tier"), [(0, 0), (1, 10)], ids=["rank-zero", "unknown-tier"])
def test_reward_gems_rejects_impossible_input(rank: int, tier: int) -> None:
    with pytest.raises(ValueError):
        reward_gems(rank, tier)


# Simulated rivals


@pytest.mark.parametrize(
    ("bot_id", "weekly_pace", "day", "xp"),
    [
        (1, 280, date(2026, 10, 5), 29),
        (1, 280, date(2026, 10, 6), 66),
        (2, 280, date(2026, 10, 5), 71),
        (17, 600, date(2026, 10, 9), 91),
        (29, 40, date(2026, 10, 11), 6),
    ],
)
def test_bot_day_xp_is_the_same_on_every_run(
    bot_id: int, weekly_pace: int, day: date, xp: int
) -> None:
    # Pinned values, first computed in another process: they prove the draw is not salted
    # per process, and a change here would silently reshuffle every simulated leaderboard.
    assert bot_day_xp(bot_id, weekly_pace, day) == xp


def test_bot_day_xp_varies_by_day_and_by_bot() -> None:
    week = [date(2026, 10, 5) + timedelta(days=offset) for offset in range(7)]
    assert len({bot_day_xp(1, 280, day) for day in week}) > 1
    assert len({bot_day_xp(bot_id, 280, date(2026, 10, 9)) for bot_id in range(1, 30)}) > 1


@pytest.mark.parametrize("weekly_pace", [40, 280, 600])
def test_bots_average_their_weekly_pace(weekly_pace: int) -> None:
    year = [date(2026, 1, 1) + timedelta(days=offset) for offset in range(365)]
    amounts = [bot_day_xp(7, weekly_pace, day) for day in year]
    assert min(amounts) >= 0
    assert max(amounts) <= round(2 * weekly_pace / 7)
    assert sum(amounts) / len(amounts) * 7 == pytest.approx(weekly_pace, rel=0.1)


def test_a_bot_without_pace_earns_nothing() -> None:
    assert bot_day_xp(3, 0, date(2026, 10, 9)) == 0


def test_bot_day_xp_rejects_a_negative_pace() -> None:
    with pytest.raises(ValueError, match="weekly_pace"):
        bot_day_xp(3, -10, date(2026, 10, 9))
