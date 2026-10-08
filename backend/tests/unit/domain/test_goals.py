import pytest

from app.domain.goals import DAILY_GOAL_OPTIONS, GOAL_CHEST_GEMS, goal_reached_now


def test_rules() -> None:
    assert DAILY_GOAL_OPTIONS == (1, 10, 20, 30, 50)
    assert GOAL_CHEST_GEMS == 5


@pytest.mark.parametrize(
    ("before_xp", "after_xp", "goal", "reached"),
    [
        pytest.param(15, 25, 20, True, id="crossed"),
        pytest.param(10, 20, 20, True, id="landed-on-the-goal"),
        pytest.param(0, 15, 1, True, id="smallest-goal"),
        pytest.param(0, 15, 20, False, id="still-short"),
        pytest.param(20, 30, 20, False, id="reached-earlier"),
        pytest.param(35, 45, 20, False, id="well-past-the-goal"),
        pytest.param(19, 19, 20, False, id="no-xp-earned"),
    ],
)
def test_goal_reached_now(before_xp: int, after_xp: int, goal: int, reached: bool) -> None:
    assert goal_reached_now(before_xp, after_xp, goal) is reached


def test_the_goal_is_reached_once_in_a_day_of_sessions() -> None:
    today_xp = 0
    crossings = []
    for award in (10, 10, 15, 12):
        crossings.append(goal_reached_now(today_xp, today_xp + award, goal=20))
        today_xp += award
    assert crossings == [False, True, False, False]
