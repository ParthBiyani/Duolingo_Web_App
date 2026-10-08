from datetime import datetime
from typing import Literal

from app.schemas.common import ApiModel, Zone


class LeaderboardRow(ApiModel):
    rank: int
    user_id: int
    display_name: str
    avatar_color: str
    xp: int
    is_me: bool
    zone: Zone


class TierInfo(ApiModel):
    tier: int
    name: str
    color: str


class LastResult(ApiModel):
    tier_before: int
    tier_after: int
    outcome: Literal["promoted", "stayed", "demoted"]
    rank: int
    gems: int


class LeaderboardResponse(ApiModel):
    unlocked: bool
    lessons_to_unlock: int
    tier: int
    name: str
    tiers: list[TierInfo]
    week_start: str
    ends_at: datetime
    promote_count: int
    demote_count: int
    rows: list[LeaderboardRow]
    last_result: LastResult | None
    server_now: datetime
