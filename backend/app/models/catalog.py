"""Catalogue data (achievements, shop items), learners' achievement levels and app settings."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, get_args

from sqlalchemy import CheckConstraint, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, JSONText, check_bool, check_in, int_default

AchievementMetric = Literal[
    "streak", "xp_total", "perfect_lessons", "league_tier", "daily_xp", "legendary_skills"
]


class Achievement(Base):
    __tablename__ = "achievements"
    __table_args__ = (
        check_in("metric", get_args(AchievementMetric)),
        CheckConstraint("json_valid(thresholds)", name="thresholds_json"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str]
    description: Mapped[str]  # "{n}" is replaced with the next target
    metric: Mapped[AchievementMetric] = mapped_column(Text)
    thresholds: Mapped[list[int]] = mapped_column(JSONText)  # metric value for each level
    gems_per_level: Mapped[int] = mapped_column(server_default=int_default(25))
    color: Mapped[str]
    position: Mapped[int] = mapped_column(unique=True)


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    achievement_id: Mapped[int] = mapped_column(
        ForeignKey("achievements.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    level: Mapped[int] = mapped_column(server_default=int_default(0))
    progress: Mapped[int] = mapped_column(server_default=int_default(0))
    updated_at: Mapped[datetime]

    achievement: Mapped[Achievement] = relationship()


class ShopItem(Base):
    __tablename__ = "shop_items"
    __table_args__ = (check_bool("is_available"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str]
    description: Mapped[str]
    price_gems: Mapped[int | None]  # None while the item is not on sale
    in_lesson_price_gems: Mapped[int | None]  # price when bought from inside a lesson
    is_available: Mapped[bool] = mapped_column(server_default=int_default(1))


class AppSetting(Base):
    """Application-wide key/value settings, e.g. the demo clock offset."""

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(primary_key=True)
    value: Mapped[str]
