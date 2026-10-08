"""Gem spending: heart refills and streak freezes. Super features are placeholders."""

from datetime import datetime
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.domain.hearts import MAX_HEARTS
from app.domain.hearts import refill_hearts as full_hearts
from app.domain.streak import MAX_FREEZES
from app.models import ShopItem as ShopItemRow
from app.models import User
from app.schemas.shop import PurchaseResponse, RefillResponse, ShopItem, ShopResponse
from app.services.common import add_gems, apply_hearts, next_heart, settle

REFILL_PRICE = 350
REFILL_PRICE_IN_LESSON = 450
FREEZE_PRICE = 200


def refill_hearts(
    db: Session, now: datetime, user: User, context: Literal["shop", "lesson"]
) -> RefillResponse:
    stats = settle(db, user, now)
    if stats.hearts >= MAX_HEARTS:
        raise AppError(409, "hearts_full", "Hearts are full", "You already have full hearts.")
    price = REFILL_PRICE_IN_LESSON if context == "lesson" else REFILL_PRICE
    add_gems(db, user, -price, "heart_refill", now)
    apply_hearts(stats, full_hearts())
    db.commit()
    return RefillResponse(hearts=stats.hearts, gems=stats.gems, next_heart_at=next_heart(stats))


def get_shop(db: Session, now: datetime, user: User) -> ShopResponse:
    stats = settle(db, user, now)
    rows = {row.key: row for row in db.scalars(select(ShopItemRow)).all()}
    items: list[ShopItem] = []

    refill = rows.get("heart_refill")
    if refill is not None:
        reason: Literal["full", "insufficient_gems"] | None = None
        if stats.hearts >= MAX_HEARTS:
            reason = "full"
        elif stats.gems < REFILL_PRICE:
            reason = "insufficient_gems"
        items.append(
            ShopItem(
                key="heart_refill",
                name=refill.name,
                description=refill.description,
                price_gems=REFILL_PRICE,
                available=reason is None,
                owned=None,
                max_owned=None,
                disabled_reason=reason,
            )
        )

    unlimited = rows.get("unlimited_hearts")
    if unlimited is not None:
        items.append(
            ShopItem(
                key="unlimited_hearts",
                name=unlimited.name,
                description=unlimited.description,
                price_gems=None,
                available=False,
                owned=None,
                max_owned=None,
                disabled_reason="coming_soon",
            )
        )

    freeze = rows.get("streak_freeze")
    if freeze is not None:
        freeze_reason: Literal["max_owned", "insufficient_gems"] | None = None
        if stats.streak_freezes >= MAX_FREEZES:
            freeze_reason = "max_owned"
        elif stats.gems < FREEZE_PRICE:
            freeze_reason = "insufficient_gems"
        items.append(
            ShopItem(
                key="streak_freeze",
                name=freeze.name,
                description=freeze.description,
                price_gems=FREEZE_PRICE,
                available=freeze_reason is None,
                owned=stats.streak_freezes,
                max_owned=MAX_FREEZES,
                disabled_reason=freeze_reason,
            )
        )
    db.commit()
    return ShopResponse(gems=stats.gems, items=items)


def purchase(db: Session, now: datetime, user: User, item_key: str) -> PurchaseResponse:
    if item_key == "heart_refill":
        refill_hearts(db, now, user, "shop")
    elif item_key == "streak_freeze":
        stats = settle(db, user, now)
        if stats.streak_freezes >= MAX_FREEZES:
            raise AppError(409, "max_owned", "Already equipped", "You can hold two streak freezes.")
        add_gems(db, user, -FREEZE_PRICE, "streak_freeze", now)
        stats.streak_freezes += 1
        db.commit()
    else:
        raise AppError(409, "coming_soon", "Coming soon", "This item is not available yet.")
    stats = user.stats
    return PurchaseResponse(
        gems=stats.gems, hearts=stats.hearts, streak_freezes=stats.streak_freezes
    )
