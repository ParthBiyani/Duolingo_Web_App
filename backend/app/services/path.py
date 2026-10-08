"""The learning path: units and nodes with the learner's state, and treasure chests."""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError
from app.domain.path_state import NodeInput, NodeProgress, NodeState, compute_node_states
from app.models import Skill, SkillProgress, Unit, User
from app.schemas.path import ChestClaimResponse, PathNode, PathResponse, PathUnit
from app.services.common import add_gems, course_ref, current_course, settle


@dataclass(frozen=True)
class PathSnapshot:
    """The course structure plus the learner's resolved node states."""

    units: list[Unit]
    states: dict[int, NodeState]
    progress: dict[int, SkillProgress]

    def skill(self, skill_id: int) -> Skill | None:
        for unit in self.units:
            for skill in unit.skills:
                if skill.id == skill_id:
                    return skill
        return None


def load_path(db: Session, user: User) -> PathSnapshot:
    course = current_course(db, user)
    units = list(
        db.scalars(
            select(Unit)
            .where(Unit.course_id == course.id)
            .order_by(Unit.position)
            .options(selectinload(Unit.skills).selectinload(Skill.lessons))
        ).all()
    )
    progress = {
        row.skill_id: row
        for row in db.scalars(select(SkillProgress).where(SkillProgress.user_id == user.id)).all()
    }
    nodes = [
        NodeInput(id=skill.id, type=skill.type, lessons_total=len(skill.lessons))
        for unit in units
        for skill in sorted(unit.skills, key=lambda s: s.position)
    ]
    node_progress = {
        skill_id: NodeProgress(
            lessons_completed=row.lessons_completed,
            crown_level=row.crown_level,
            chest_claimed=row.completed_at is not None,
        )
        for skill_id, row in progress.items()
    }
    states = {state.id: state for state in compute_node_states(nodes, node_progress)}
    return PathSnapshot(units=units, states=states, progress=progress)


def next_lesson_id(skill: Skill, lessons_completed: int) -> int | None:
    lessons = sorted(skill.lessons, key=lambda lesson: lesson.position)
    if not lessons:
        return None
    if lessons_completed >= len(lessons):
        return lessons[0].id  # completed skills replay from the first lesson (review)
    return lessons[lessons_completed].id


def get_path(db: Session, now: datetime, user: User) -> PathResponse:
    settle(db, user, now)
    snapshot = load_path(db, user)
    active_node_id: int | None = None
    units: list[PathUnit] = []
    for unit in snapshot.units:
        nodes: list[PathNode] = []
        for skill in sorted(unit.skills, key=lambda s: s.position):
            state = snapshot.states[skill.id]
            if state.state == "active":
                active_node_id = skill.id
            nodes.append(
                PathNode(
                    id=skill.id,
                    type=skill.type,
                    position=skill.position,
                    title=skill.title,
                    icon=skill.icon,
                    state=state.state,
                    lessons_total=len(skill.lessons),
                    lessons_completed=state.lessons_completed,
                    crown_level=state.crown_level,
                    next_lesson_id=next_lesson_id(skill, state.lessons_completed),
                    chest_claimed=skill.type == "chest" and state.state == "completed",
                )
            )
        units.append(
            PathUnit(
                id=unit.id,
                section=unit.section,
                position=unit.position,
                title=unit.title,
                description=unit.description,
                color=unit.color,
                nodes=nodes,
            )
        )
    response = PathResponse(
        course=course_ref(current_course(db, user)),
        units=units,
        active_node_id=active_node_id,
        server_now=now,
    )
    db.commit()
    return response


def claim_chest(db: Session, now: datetime, user: User, skill_id: int) -> ChestClaimResponse:
    settle(db, user, now)
    snapshot = load_path(db, user)
    skill = snapshot.skill(skill_id)
    if skill is None or skill.type != "chest":
        raise AppError(404, "not_found", "Not found", "There is no chest with that id.")
    state = snapshot.states[skill.id].state
    if state == "completed":
        raise AppError(409, "already_claimed", "Already opened", "This chest is already open.")
    if state != "active":
        raise AppError(409, "skill_locked", "Locked", "Complete the levels above first.")
    reward = skill.chest_gems or 0
    add_gems(db, user, reward, "path_chest", now, ref=f"chest:{skill.id}")
    progress = snapshot.progress.get(skill.id)
    if progress is None:
        progress = SkillProgress(
            user_id=user.id, skill_id=skill.id, lessons_completed=0, crown_level=0
        )
        db.add(progress)
    progress.completed_at = now
    db.commit()
    return ChestClaimResponse(gems=user.stats.gems, reward=reward)
