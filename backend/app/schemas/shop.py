from datetime import datetime
from typing import Literal

from app.schemas.common import ApiModel

ShopItemKey = Literal["heart_refill", "streak_freeze", "unlimited_hearts", "legendary_entry"]


class RefillRequest(ApiModel):
    context: Literal["shop", "lesson"]


class RefillResponse(ApiModel):
    hearts: int
    gems: int
    next_heart_at: datetime | None


class ShopItem(ApiModel):
    key: ShopItemKey
    name: str
    description: str
    price_gems: int | None
    available: bool
    owned: int | None
    max_owned: int | None
    disabled_reason: Literal["full", "max_owned", "insufficient_gems", "coming_soon"] | None


class ShopResponse(ApiModel):
    gems: int
    items: list[ShopItem]


class PurchaseRequest(ApiModel):
    item_key: ShopItemKey


class PurchaseResponse(ApiModel):
    gems: int
    hearts: int
    streak_freezes: int
