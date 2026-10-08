import pytest

from app.domain.path_state import NodeInput, NodeProgress, NodeState, compute_node_states

LOCKED, ACTIVE, COMPLETED, LEGENDARY = "locked", "active", "completed", "legendary"

# One unit in path order, then the first node of the next unit.
PATH = (
    NodeInput(id=1, type="lesson", lessons_total=3),
    NodeInput(id=2, type="lesson", lessons_total=3),
    NodeInput(id=3, type="chest", lessons_total=0),
    NodeInput(id=4, type="lesson", lessons_total=3),
    NodeInput(id=5, type="lesson", lessons_total=3),
    NodeInput(id=6, type="unit_review", lessons_total=1),
    NodeInput(id=7, type="lesson", lessons_total=3),
)

DONE = NodeProgress(lessons_completed=3, crown_level=1, chest_claimed=False)
MASTERED = NodeProgress(lessons_completed=3, crown_level=2, chest_claimed=False)
CLAIMED = NodeProgress(lessons_completed=0, crown_level=0, chest_claimed=True)
REVIEWED = NodeProgress(lessons_completed=1, crown_level=1, chest_claimed=False)
UNIT_DONE = {1: DONE, 2: DONE, 3: CLAIMED, 4: DONE, 5: DONE, 6: REVIEWED}


def started(lessons_completed: int) -> NodeProgress:
    return NodeProgress(lessons_completed=lessons_completed, crown_level=0, chest_claimed=False)


def path_states(progress: dict[int, NodeProgress]) -> list[str]:
    return [node.state for node in compute_node_states(PATH, progress)]


@pytest.mark.parametrize(
    ("progress", "expected"),
    [
        pytest.param(
            {}, [ACTIVE, LOCKED, LOCKED, LOCKED, LOCKED, LOCKED, LOCKED], id="new-learner"
        ),
        pytest.param(
            {1: started(2)},
            [ACTIVE, LOCKED, LOCKED, LOCKED, LOCKED, LOCKED, LOCKED],
            id="first-skill-in-progress",
        ),
        pytest.param(
            {1: DONE},
            [COMPLETED, ACTIVE, LOCKED, LOCKED, LOCKED, LOCKED, LOCKED],
            id="first-skill-done",
        ),
        pytest.param(
            {1: DONE, 2: DONE},
            [COMPLETED, COMPLETED, ACTIVE, LOCKED, LOCKED, LOCKED, LOCKED],
            id="chest-unclaimed",
        ),
        pytest.param(
            {1: DONE, 2: DONE, 3: CLAIMED},
            [COMPLETED, COMPLETED, COMPLETED, ACTIVE, LOCKED, LOCKED, LOCKED],
            id="chest-claimed",
        ),
        pytest.param(
            {1: DONE, 2: DONE, 3: CLAIMED, 4: DONE, 5: DONE},
            [COMPLETED, COMPLETED, COMPLETED, COMPLETED, COMPLETED, ACTIVE, LOCKED],
            id="unit-review-unlocked",
        ),
        pytest.param(
            UNIT_DONE,
            [COMPLETED, COMPLETED, COMPLETED, COMPLETED, COMPLETED, COMPLETED, ACTIVE],
            id="next-unit-unlocked",
        ),
        pytest.param(
            {1: MASTERED, 2: DONE},
            [LEGENDARY, COMPLETED, ACTIVE, LOCKED, LOCKED, LOCKED, LOCKED],
            id="legendary-skill",
        ),
        pytest.param(
            UNIT_DONE | {7: DONE},
            [COMPLETED, COMPLETED, COMPLETED, COMPLETED, COMPLETED, COMPLETED, COMPLETED],
            id="everything-done",
        ),
    ],
)
def test_the_path_unlocks_one_node_at_a_time(
    progress: dict[int, NodeProgress], expected: list[str]
) -> None:
    assert path_states(progress) == expected


def test_progress_is_reported_for_each_node_in_course_order() -> None:
    result = compute_node_states(PATH, {1: MASTERED, 2: started(1)})
    assert [node.id for node in result] == [1, 2, 3, 4, 5, 6, 7]
    assert result[:3] == [
        NodeState(id=1, state="legendary", lessons_completed=3, crown_level=2),
        NodeState(id=2, state="active", lessons_completed=1, crown_level=0),
        NodeState(id=3, state="locked", lessons_completed=0, crown_level=0),
    ]


def test_a_node_without_lessons_is_not_completed_by_default() -> None:
    [node] = compute_node_states([NodeInput(id=9, type="practice", lessons_total=0)], {})
    assert node.state == ACTIVE


def test_progress_after_the_active_node_stays_visible() -> None:
    # Content inserted mid-path can leave finished nodes after the first unfinished one.
    assert path_states({1: DONE, 3: CLAIMED}) == [
        COMPLETED,
        ACTIVE,
        COMPLETED,
        LOCKED,
        LOCKED,
        LOCKED,
        LOCKED,
    ]


def test_an_empty_path_has_no_nodes() -> None:
    assert compute_node_states([], {}) == []
