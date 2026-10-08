"""Achievements: badges that level up as a learner statistic passes fixed thresholds."""

from bisect import bisect_right
from collections.abc import Sequence
from dataclasses import dataclass
from itertools import pairwise
from typing import Literal

Metric = Literal[
    "streak", "xp_total", "perfect_lessons", "league_tier", "daily_xp", "legendary_skills"
]

GEMS_PER_LEVEL = 25


@dataclass(frozen=True)
class AchievementDef:
    key: str
    name: str
    metric: Metric
    thresholds: tuple[int, ...]  # metric value needed for each level, ascending
    color: str
    description: str  # "{n}" is replaced with the target value


ACHIEVEMENTS: tuple[AchievementDef, ...] = (
    AchievementDef(
        key="wildfire",
        name="Wildfire",
        metric="streak",
        thresholds=(3, 7, 14, 30, 50, 75, 125, 180, 250, 365),
        color="#FF9600",
        description="Reach a {n} day streak",
    ),
    AchievementDef(
        key="sage",
        name="Sage",
        metric="xp_total",
        thresholds=(100, 250, 500, 1000, 2000, 4000, 7500, 12500, 20000, 30000),
        color="#58CC02",
        description="Earn {n} XP",
    ),
    AchievementDef(
        key="sharpshooter",
        name="Sharpshooter",
        metric="perfect_lessons",
        thresholds=(1, 5, 20, 50, 100),
        color="#FF4B4B",
        description="Finish {n} of your lessons without a single mistake",
    ),
    AchievementDef(
        key="champion",
        name="Champion",
        # Highest league reached as tier + 1 (Bronze is 1), or 0 while leagues are locked.
        metric="league_tier",
        thresholds=(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
        color="#FFC800",
        description="Climb to league {n} of 10",
    ),
    AchievementDef(
        key="overachiever",
        name="Overachiever",
        metric="daily_xp",
        thresholds=(50, 100, 200),
        color="#1CB0F6",
        description="Earn {n} XP in a single day",
    ),
    AchievementDef(
        key="legendary",
        name="Legendary",
        metric="legendary_skills",
        thresholds=(1, 5, 10, 25, 50),
        color="#CE82FF",
        description="Reach Legendary in {n} of your skills",
    ),
)


def level_for(value: int, thresholds: Sequence[int]) -> tuple[int, int, int]:
    """Return ``(level, progress, target)`` for a metric value.

    ``level`` counts the thresholds reached. ``target`` is the next threshold, or the last
    one once every level is reached, and ``progress`` is the value capped at that target,
    ready to show as "12 / 14".
    """
    _check_thresholds(thresholds)
    level = bisect_right(thresholds, value)
    target = thresholds[min(level, len(thresholds) - 1)]
    return level, min(value, target), target


def levels_gained(before: int, after: int, thresholds: Sequence[int]) -> list[int]:
    """Return the levels crossed when a metric goes from ``before`` to ``after``.

    One jump can cross several levels. A falling value (a streak that reset) crosses none.
    For a metric that can fall and climb back, compare against the stored level instead,
    so a level is never awarded twice.
    """
    _check_thresholds(thresholds)
    return list(range(bisect_right(thresholds, before) + 1, bisect_right(thresholds, after) + 1))


def _check_thresholds(thresholds: Sequence[int]) -> None:
    if not thresholds:
        raise ValueError("thresholds must not be empty")
    if any(lower >= upper for lower, upper in pairwise(thresholds)):
        raise ValueError(f"thresholds must be strictly increasing, got {list(thresholds)}")
