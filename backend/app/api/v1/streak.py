from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import ClockDep, CurrentUser, DbSession
from app.schemas.streak import StreakCalendarResponse
from app.services import streak

router = APIRouter(prefix="/streak", tags=["streak"])

MonthParam = Annotated[
    str | None,
    Query(
        pattern=r"^\d{4}-(0[1-9]|1[0-2])$",
        description="The month to show as YYYY-MM; defaults to the learner's current month.",
    ),
]


@router.get(
    "/calendar",
    response_model=StreakCalendarResponse,
    summary="One month of streak days with the current streak and next goal",
)
def get_calendar(
    db: DbSession, clock: ClockDep, user: CurrentUser, month: MonthParam = None
) -> StreakCalendarResponse:
    return streak.get_calendar(db, clock.now(), user, month)
