from fastapi import APIRouter

from app.api.deps import ClockDep, CurrentUser, DbSession
from app.schemas.leaderboard import LeaderboardResponse
from app.services import leagues

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=LeaderboardResponse, summary="This week's league standings")
def get_leaderboard(db: DbSession, clock: ClockDep, user: CurrentUser) -> LeaderboardResponse:
    return leagues.get_leaderboard(db, clock.now(), user)
