from fastapi import APIRouter

from app.api.deps import ClockDep, CurrentUser, DbSession
from app.schemas.shop import PurchaseRequest, PurchaseResponse, ShopResponse
from app.services import shop

router = APIRouter(prefix="/shop", tags=["shop"])


@router.get("", response_model=ShopResponse, summary="Shop items with prices and availability")
def get_shop(db: DbSession, clock: ClockDep, user: CurrentUser) -> ShopResponse:
    return shop.get_shop(db, clock.now(), user)


@router.post("/purchases", response_model=PurchaseResponse, summary="Buy an item with gems")
def purchase(
    body: PurchaseRequest, db: DbSession, clock: ClockDep, user: CurrentUser
) -> PurchaseResponse:
    return shop.purchase(db, clock.now(), user, body.item_key)
