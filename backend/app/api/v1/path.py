from fastapi import APIRouter

from app.api.deps import ClockDep, CurrentUser, DbSession
from app.schemas.path import ChestClaimResponse, PathResponse
from app.services import path

router = APIRouter(tags=["path"])


@router.get(
    "/courses/current/path",
    response_model=PathResponse,
    summary="Units and nodes with the learner's state",
)
def get_path(db: DbSession, clock: ClockDep, user: CurrentUser) -> PathResponse:
    return path.get_path(db, clock.now(), user)


@router.post(
    "/skills/{skill_id}/chest",
    response_model=ChestClaimResponse,
    summary="Open a treasure chest node (once)",
)
def claim_chest(
    skill_id: int, db: DbSession, clock: ClockDep, user: CurrentUser
) -> ChestClaimResponse:
    return path.claim_chest(db, clock.now(), user, skill_id)
