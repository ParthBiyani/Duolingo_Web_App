"""States of the nodes on the learning path, which unlocks strictly in order."""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Literal

NodeStateName = Literal["locked", "active", "completed", "legendary"]

LEGENDARY_CROWN = 2  # crown 1 marks a completed skill, crown 2 a legendary one


@dataclass(frozen=True)
class NodeInput:
    id: int
    type: str  # "lesson", "chest", "practice" or "unit_review"
    lessons_total: int


@dataclass(frozen=True)
class NodeProgress:
    lessons_completed: int
    crown_level: int
    chest_claimed: bool


@dataclass(frozen=True)
class NodeState:
    id: int
    state: NodeStateName
    lessons_completed: int
    crown_level: int


_NO_PROGRESS = NodeProgress(lessons_completed=0, crown_level=0, chest_claimed=False)


def compute_node_states(
    nodes: Sequence[NodeInput], progress: Mapping[int, NodeProgress]
) -> list[NodeState]:
    """Resolve the state of each node; ``nodes`` must be in course order.

    A node is legendary when it has the legendary crown, and completed when its chest was
    claimed or all of its lessons are done. The first node that is neither is the active one
    and every other such node is locked, so the path opens one node at a time. ``progress``
    maps node ids to the learner's progress; a missing entry means no progress yet.
    """
    states: list[NodeState] = []
    active_found = False
    for node in nodes:
        node_progress = progress.get(node.id, _NO_PROGRESS)
        state: NodeStateName
        if node_progress.crown_level >= LEGENDARY_CROWN:
            state = "legendary"
        elif _is_completed(node, node_progress):
            state = "completed"
        elif not active_found:
            state = "active"
            active_found = True
        else:
            state = "locked"
        states.append(
            NodeState(
                id=node.id,
                state=state,
                lessons_completed=node_progress.lessons_completed,
                crown_level=node_progress.crown_level,
            )
        )
    return states


def _is_completed(node: NodeInput, node_progress: NodeProgress) -> bool:
    if node.type == "chest":
        return node_progress.chest_claimed
    # The "0 <" stops a node without lessons from counting as completed by default.
    return 0 < node.lessons_total <= node_progress.lessons_completed
