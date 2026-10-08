"""Weekly leagues: tiers, ranking, promotion and demotion zones, rewards and rival XP."""

import hashlib
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal

Zone = Literal["promotion", "safe", "demotion"]
LeagueOutcome = Literal["promoted", "stayed", "demoted"]

COHORT_SIZE = 30  # the learner plus 29 rivals


@dataclass(frozen=True)
class LeagueTier:
    tier: int
    name: str
    color: str
    promote: int  # how many at the top move up a league at the end of the week
    demote: int  # how many at the bottom move down
    rewards: tuple[int, int, int]  # gems for finishing 1st, 2nd and 3rd


# Podium prizes grow by 5 gems per league, with larger first and second prizes in Diamond.
TIERS: tuple[LeagueTier, ...] = (
    LeagueTier(0, "Bronze", "#CD7F32", promote=20, demote=0, rewards=(20, 10, 5)),
    LeagueTier(1, "Silver", "#C0C0C0", promote=15, demote=5, rewards=(25, 15, 10)),
    LeagueTier(2, "Gold", "#FFC800", promote=10, demote=5, rewards=(30, 20, 15)),
    LeagueTier(3, "Sapphire", "#1CB0F6", promote=7, demote=5, rewards=(35, 25, 20)),
    LeagueTier(4, "Ruby", "#FF4B4B", promote=7, demote=5, rewards=(40, 30, 25)),
    LeagueTier(5, "Emerald", "#58CC02", promote=7, demote=5, rewards=(45, 35, 30)),
    LeagueTier(6, "Amethyst", "#CE82FF", promote=7, demote=5, rewards=(50, 40, 35)),
    LeagueTier(7, "Pearl", "#FFB6C1", promote=7, demote=5, rewards=(55, 45, 40)),
    LeagueTier(8, "Obsidian", "#4B4B4B", promote=5, demote=5, rewards=(60, 50, 45)),
    LeagueTier(9, "Diamond", "#49C0F8", promote=0, demote=5, rewards=(75, 60, 50)),
)

_OUTCOME_BY_ZONE: dict[Zone, LeagueOutcome] = {
    "promotion": "promoted",
    "safe": "stayed",
    "demotion": "demoted",
}


@dataclass(frozen=True)
class Standing:
    user_id: int
    xp: int  # XP earned this league week
    reached_at: datetime  # when the learner reached that total; earlier wins a tie


@dataclass(frozen=True)
class Ranked:
    user_id: int
    xp: int
    rank: int
    zone: Zone


def get_tier(tier: int) -> LeagueTier:
    """Look up a tier by number. Rejects numbers outside 0-9 instead of wrapping around."""
    if not 0 <= tier < len(TIERS):
        raise ValueError(f"unknown league tier: {tier}")
    return TIERS[tier]


def rank_standings(rows: Sequence[Standing], tier: int) -> list[Ranked]:
    """Rank a cohort by weekly XP and give each row its zone.

    Equal XP goes to whoever reached it first. The user id breaks any remaining tie, so
    ranks are unique and the order never depends on how the rows were fetched.
    """
    league = get_tier(tier)
    ordered = sorted(rows, key=lambda row: (-row.xp, row.reached_at, row.user_id))
    return [
        Ranked(user_id=row.user_id, xp=row.xp, rank=rank, zone=_zone(rank, league, len(ordered)))
        for rank, row in enumerate(ordered, start=1)
    ]


def outcome_for(rank: int, tier: int, size: int) -> LeagueOutcome:
    """Return where a final rank in a cohort of ``size`` sends the learner next week."""
    if not 1 <= rank <= size:
        raise ValueError(f"rank {rank} is outside a cohort of {size}")
    return _OUTCOME_BY_ZONE[_zone(rank, get_tier(tier), size)]


def reward_gems(rank: int, tier: int) -> int:
    """Return the gems for a final rank: a prize for the top three, nothing below."""
    if rank < 1:
        raise ValueError(f"rank must be at least 1, got {rank}")
    rewards = get_tier(tier).rewards
    return rewards[rank - 1] if rank <= len(rewards) else 0


def bot_day_xp(bot_id: int, weekly_pace: int, day: date) -> int:
    """Return the XP a simulated rival earns on ``day``.

    The amount lies between 0 and twice the bot's daily average (``weekly_pace / 7``), so on
    average a bot earns its weekly pace. The "random" draw is the SHA-256 digest of the bot
    id and date read as a fraction, which gives the same amount for the same inputs on every
    run. Python's built-in hash() would not: it is salted differently in each process.
    """
    if weekly_pace < 0:
        raise ValueError(f"weekly_pace must not be negative, got {weekly_pace}")
    digest = hashlib.sha256(f"{bot_id}:{day.isoformat()}".encode()).digest()
    fraction = int.from_bytes(digest[:8], "big") / 2**64  # uniform in [0, 1)
    return round(2 * weekly_pace / 7 * fraction)


def _zone(rank: int, league: LeagueTier, size: int) -> Zone:
    # Promotion is checked first: in a cohort too small for both zones, the top rows move up.
    if rank <= league.promote:
        return "promotion"
    if rank > size - league.demote:
        return "demotion"
    return "safe"
