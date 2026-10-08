from fastapi import APIRouter

from app.api.deps import ClockDep, CurrentUser, DbSession
from app.schemas.profile import ProfileResponse, QuestsResponse
from app.services import profile

router = APIRouter(tags=["profile"])


@router.get("/profile", response_model=ProfileResponse, summary="Statistics and achievements")
def get_profile(db: DbSession, clock: ClockDep, user: CurrentUser) -> ProfileResponse:
    return profile.get_profile(db, clock.now(), user)


@router.get("/quests", response_model=QuestsResponse, summary="Daily goal quest")
def get_quests(db: DbSession, clock: ClockDep, user: CurrentUser) -> QuestsResponse:
    return profile.get_quests(db, clock.now(), user)
