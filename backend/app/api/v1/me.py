from fastapi import APIRouter

from app.api.deps import ClockDep, CurrentUser, DbSession
from app.schemas.me import MeResponse, MeUpdate, Settings, SettingsUpdate
from app.services import leagues, learner

router = APIRouter(prefix="/me", tags=["learner"])


@router.get("", response_model=MeResponse, summary="Current learner with settled stats")
def get_me(db: DbSession, clock: ClockDep, user: CurrentUser) -> MeResponse:
    now = clock.now()
    leagues.close_past_weeks(db, user, now)  # the league shown is the one the learner is in now
    return learner.get_me(db, now, user)


@router.patch("", response_model=MeResponse, summary="Update daily goal or time zone")
def update_me(body: MeUpdate, db: DbSession, clock: ClockDep, user: CurrentUser) -> MeResponse:
    return learner.update_me(db, clock.now(), user, body)


@router.patch("/settings", response_model=Settings, summary="Update preferences")
def update_settings(body: SettingsUpdate, db: DbSession, user: CurrentUser) -> Settings:
    return learner.update_settings(db, user, body)
