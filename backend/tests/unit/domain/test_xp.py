import pytest

from app.domain.xp import XpBreakdown, combo_bonus, session_xp

# Bonus by longest first-try run (the list index). Ten exercises: steps of 2 answers.
COMBO_10 = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]
# Fifteen exercises (a unit review): steps of 3 answers.
COMBO_15 = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5]


@pytest.mark.parametrize(("max_run", "bonus"), list(enumerate(COMBO_10)))
def test_combo_bonus_for_ten_exercises(max_run: int, bonus: int) -> None:
    assert combo_bonus(max_run, 10) == bonus


@pytest.mark.parametrize(("max_run", "bonus"), list(enumerate(COMBO_15)))
def test_combo_bonus_for_fifteen_exercises(max_run: int, bonus: int) -> None:
    assert combo_bonus(max_run, 15) == bonus


@pytest.mark.parametrize(
    ("max_run", "exercise_count", "bonus"),
    [
        pytest.param(3, 5, 3, id="one-answer-per-step"),
        pytest.param(1, 1, 1, id="single-exercise"),
        pytest.param(12, 10, 5, id="never-above-five"),
        pytest.param(0, 0, 0, id="no-exercises"),
        pytest.param(-1, 10, 0, id="negative-run"),
    ],
)
def test_combo_bonus_edges(max_run: int, exercise_count: int, bonus: int) -> None:
    assert combo_bonus(max_run, exercise_count) == bonus


@pytest.mark.parametrize(
    ("kind", "max_run", "exercise_count", "correct_count", "expected"),
    [
        pytest.param("lesson", 10, 10, 10, XpBreakdown(10, 5, 15), id="flawless-lesson"),
        pytest.param("lesson", 3, 10, 8, XpBreakdown(10, 2, 12), id="lesson-with-mistakes"),
        pytest.param("lesson", 0, 10, 10, XpBreakdown(10, 0, 10), id="lesson-without-a-run"),
        pytest.param("practice", 15, 15, 15, XpBreakdown(10, 5, 15), id="flawless-practice"),
        pytest.param("practice", 4, 10, 9, XpBreakdown(10, 2, 12), id="practice"),
        pytest.param("review", 10, 10, 10, XpBreakdown(5, 0, 5), id="review-has-no-combo"),
        pytest.param("legendary", 15, 15, 15, XpBreakdown(40, 0, 40), id="legendary"),
        pytest.param("timed", 0, 30, 7, XpBreakdown(7, 0, 7), id="timed-pays-per-answer"),
        pytest.param("timed", 0, 30, 20, XpBreakdown(20, 0, 20), id="timed-at-cap"),
        pytest.param("timed", 0, 40, 26, XpBreakdown(20, 0, 20), id="timed-capped"),
        pytest.param("timed", 0, 30, 0, XpBreakdown(0, 0, 0), id="timed-nothing-correct"),
    ],
)
def test_session_xp(
    kind: str, max_run: int, exercise_count: int, correct_count: int, expected: XpBreakdown
) -> None:
    assert session_xp(kind, max_run, exercise_count, correct_count) == expected


def test_session_xp_rejects_unknown_kinds() -> None:
    with pytest.raises(ValueError, match="unknown session kind"):
        session_xp("speedrun", 0, 10, 10)
