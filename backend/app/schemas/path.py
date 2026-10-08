from datetime import datetime
from typing import Literal

from app.schemas.common import ApiModel, CourseRef, NodeIcon, NodeStateName, NodeType, UnitColor


class PathNode(ApiModel):
    id: int
    type: NodeType
    position: int
    title: str
    icon: NodeIcon
    state: NodeStateName
    lessons_total: int
    lessons_completed: int
    crown_level: Literal[0, 1, 2]
    next_lesson_id: int | None
    chest_claimed: bool


class PathUnit(ApiModel):
    id: int
    section: int
    position: int
    title: str
    description: str
    color: UnitColor
    nodes: list[PathNode]


class PathResponse(ApiModel):
    course: CourseRef
    units: list[PathUnit]
    active_node_id: int | None
    server_now: datetime


class ChestClaimResponse(ApiModel):
    gems: int
    reward: int
