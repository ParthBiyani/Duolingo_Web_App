"""XP awarded for completing a session."""

import math
from dataclasses import dataclass

LESSON_XP = 10  # lessons and practice, before the combo bonus
REVIEW_XP = 5
LEGENDARY_XP = 40
TIMED_XP_CAP = 20  # timed practice pays 1 XP per correct answer, up to this cap
MAX_COMBO_BONUS = 5


@dataclass(frozen=True)
class XpBreakdown:
    base: int
    combo_bonus: int
    total: int


def combo_bonus(max_run: int, exercise_count: int) -> int:
    """Bonus XP for the longest run of first-try correct answers in a session.

    The run is counted in steps of ceil(n / 5) answers, each started step is worth 1 XP and
    the bonus is capped at 5. For the 10- and 15-exercise sessions the course uses, a
    flawless run earns the full +5.
    """
    if max_run <= 0 or exercise_count <= 0:
        return 0
    answers_per_step = math.ceil(exercise_count / MAX_COMBO_BONUS)
    return min(MAX_COMBO_BONUS, math.ceil(max_run / answers_per_step))


def session_xp(kind: str, max_run: int, exercise_count: int, correct_count: int) -> XpBreakdown:
    """Return the XP earned by a completed session of the given kind.

    Lessons and practice pay 10 plus the combo bonus, reviews 5 and legendary challenges 40.
    Timed practice pays 1 per correct answer up to 20, so it can be 0.
    """
    match kind:
        case "lesson" | "practice":
            base, bonus = LESSON_XP, combo_bonus(max_run, exercise_count)
        case "review":
            base, bonus = REVIEW_XP, 0
        case "legendary":
            base, bonus = LEGENDARY_XP, 0
        case "timed":
            base, bonus = min(correct_count, TIMED_XP_CAP), 0
        case _:
            raise ValueError(f"unknown session kind: {kind!r}")
    return XpBreakdown(base=base, combo_bonus=bonus, total=base + bonus)
