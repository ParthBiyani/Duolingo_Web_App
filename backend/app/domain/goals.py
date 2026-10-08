"""Daily XP goal."""

DAILY_GOAL_OPTIONS = (1, 10, 20, 30, 50)
GOAL_CHEST_GEMS = 5  # gems in the chest that opens when the goal is reached


def goal_reached_now(before_xp: int, after_xp: int, goal: int) -> bool:
    """Whether an award that took today's XP from ``before_xp`` to ``after_xp`` met the goal.

    Only the crossing counts, so the chest opens once a day however much XP follows.
    """
    return before_xp < goal <= after_xp
