import pytest

from app.domain.achievements import (
    ACHIEVEMENTS,
    GEMS_PER_LEVEL,
    AchievementDef,
    level_for,
    levels_gained,
)

BY_KEY = {achievement.key: achievement for achievement in ACHIEVEMENTS}
WILDFIRE = BY_KEY["wildfire"].thresholds  # 3, 7, 14, 30, 50, 75, 125, 180, 250, 365
SAGE = BY_KEY["sage"].thresholds  # 100, 250, 500, 1000, 2000, ...


def test_catalogue() -> None:
    assert [(a.key, a.metric, a.thresholds) for a in ACHIEVEMENTS] == [
        ("wildfire", "streak", (3, 7, 14, 30, 50, 75, 125, 180, 250, 365)),
        ("sage", "xp_total", (100, 250, 500, 1000, 2000, 4000, 7500, 12500, 20000, 30000)),
        ("sharpshooter", "perfect_lessons", (1, 5, 20, 50, 100)),
        ("champion", "league_tier", (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)),
        ("overachiever", "daily_xp", (50, 100, 200)),
        ("legendary", "legendary_skills", (1, 5, 10, 25, 50)),
    ]
    assert GEMS_PER_LEVEL == 25


@pytest.mark.parametrize("achievement", ACHIEVEMENTS, ids=lambda achievement: achievement.key)
def test_every_definition_is_usable(achievement: AchievementDef) -> None:
    level_for(0, achievement.thresholds)  # raises if the thresholds are not increasing
    first_goal = achievement.description.format(n=achievement.thresholds[0])
    assert str(achievement.thresholds[0]) in first_goal
    assert achievement.color.startswith("#")


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        pytest.param(0, (0, 0, 3), id="nothing-yet"),
        pytest.param(2, (0, 2, 3), id="almost-level-1"),
        pytest.param(3, (1, 3, 7), id="exactly-level-1"),
        pytest.param(12, (2, 12, 14), id="between-levels"),
        pytest.param(14, (3, 14, 30), id="exactly-level-3"),
        pytest.param(364, (9, 364, 365), id="one-short-of-max"),
        pytest.param(365, (10, 365, 365), id="max-level"),
        pytest.param(500, (10, 365, 365), id="past-max-is-capped"),
    ],
)
def test_level_for(value: int, expected: tuple[int, int, int]) -> None:
    assert level_for(value, WILDFIRE) == expected


@pytest.mark.parametrize(
    ("key", "value", "expected"),
    [
        ("wildfire", 12, (2, 12, 14)),
        ("sage", 1240, (4, 1240, 2000)),
        ("sharpshooter", 6, (2, 6, 20)),
        ("champion", 2, (2, 2, 3)),  # Silver is tier 1, counted as 2
        ("overachiever", 60, (1, 60, 100)),
        ("legendary", 1, (1, 1, 5)),
    ],
)
def test_level_for_each_achievement(key: str, value: int, expected: tuple[int, int, int]) -> None:
    assert level_for(value, BY_KEY[key].thresholds) == expected


@pytest.mark.parametrize(
    ("before", "after", "gained"),
    [
        pytest.param(0, 2, [], id="below-first-threshold"),
        pytest.param(2, 3, [1], id="first-level"),
        pytest.param(6, 14, [2, 3], id="two-levels-at-once"),
        pytest.param(0, 365, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], id="every-level"),
        pytest.param(12, 13, [], id="between-levels"),
        pytest.param(13, 14, [3], id="landing-on-a-threshold"),
        pytest.param(14, 14, [], id="no-change"),
        pytest.param(14, 0, [], id="streak-reset"),
        pytest.param(400, 500, [], id="past-max"),
    ],
)
def test_levels_gained(before: int, after: int, gained: list[int]) -> None:
    assert levels_gained(before, after, WILDFIRE) == gained


def test_one_large_award_can_unlock_several_levels_and_their_gems() -> None:
    gained = levels_gained(90, 600, SAGE)
    assert gained == [1, 2, 3]
    assert len(gained) * GEMS_PER_LEVEL == 75


@pytest.mark.parametrize(
    "thresholds", [(), (5, 3), (3, 3)], ids=["empty", "decreasing", "repeated"]
)
def test_thresholds_must_strictly_increase(thresholds: tuple[int, ...]) -> None:
    with pytest.raises(ValueError, match="thresholds"):
        level_for(1, thresholds)
    with pytest.raises(ValueError, match="thresholds"):
        levels_gained(0, 1, thresholds)
