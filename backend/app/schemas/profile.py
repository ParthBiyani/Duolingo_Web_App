from datetime import datetime
from typing import Literal

from app.schemas.common import ApiModel, CourseRef, UserRef


class AchievementView(ApiModel):
    key: str
    name: str
    description: str
    level: int
    max_level: int
    progress: int
    target: int
    color: str


class ProfileStats(ApiModel):
    streak: int
    xp_total: int
    league_name: str | None
    top3_finishes: int


class ProfileResponse(ApiModel):
    user: UserRef
    course: CourseRef
    stats: ProfileStats
    achievements: list[AchievementView]


class DailyQuest(ApiModel):
    key: Literal["daily_goal"]
    title: str
    progress: int
    target: int
    completed: bool
    chest_gems: int


class QuestsResponse(ApiModel):
    ends_at: datetime
    daily: list[DailyQuest]
    server_now: datetime
