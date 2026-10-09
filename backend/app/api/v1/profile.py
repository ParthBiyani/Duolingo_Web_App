from fastapi import APIRouter

from app.api.deps import ClockDep, CurrentUser, DbSession
from app.schemas.profile import ProfileResponse, QuestsResponse
from app.services import leagues, profile

router = APIRouter(tags=["profile"])


@router.get("/profile", response_model=ProfileResponse, summary="Statistics and achievements")
def get_profile(db: DbSession, clock: ClockDep, user: CurrentUser) -> ProfileResponse:
    now = clock.now()
    leagues.close_past_weeks(db, user, now)  # the league shown is the one the learner is in now
    return profile.get_profile(db, now, user)


@router.get("/quests", response_model=QuestsResponse, summary="Daily goal quest")
def get_quests(db: DbSession, clock: ClockDep, user: CurrentUser) -> QuestsResponse:
    return profile.get_quests(db, clock.now(), user)
