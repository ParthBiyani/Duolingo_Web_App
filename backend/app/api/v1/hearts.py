from fastapi import APIRouter

from app.api.deps import ClockDep, CurrentUser, DbSession
from app.schemas.shop import RefillRequest, RefillResponse
from app.services import shop

router = APIRouter(prefix="/hearts", tags=["hearts"])


@router.post("/refill", response_model=RefillResponse, summary="Refill hearts with gems")
def refill(
    body: RefillRequest, db: DbSession, clock: ClockDep, user: CurrentUser
) -> RefillResponse:
    return shop.refill_hearts(db, clock.now(), user, body.context)
