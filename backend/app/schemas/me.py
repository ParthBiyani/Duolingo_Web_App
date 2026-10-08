from datetime import datetime

from pydantic import Field

from app.schemas.common import ApiModel, CourseRef, DailyGoal, StreakDay, Theme, UserRef


class Settings(ApiModel):
    sound_effects: bool
    animations: bool
    motivational_messages: bool
    listening_exercises: bool
    theme: Theme
    daily_goal_xp: DailyGoal


class SettingsUpdate(ApiModel):
    sound_effects: bool | None = None
    animations: bool | None = None
    motivational_messages: bool | None = None
    listening_exercises: bool | None = None
    theme: Theme | None = None
    daily_goal_xp: DailyGoal | None = None


class MeUpdate(ApiModel):
    daily_goal_xp: DailyGoal | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)


class StreakStats(ApiModel):
    current: int
    longest: int
    extended_today: bool
    freezes: int
    week: list[StreakDay]


class LeagueStats(ApiModel):
    tier: int
    name: str
    unlocked: bool


class Stats(ApiModel):
    xp_total: int
    today_xp: int
    daily_goal_xp: DailyGoal
    gems: int
    hearts: int
    hearts_max: int
    next_heart_at: datetime | None
    streak: StreakStats
    league: LeagueStats


class MeResponse(ApiModel):
    user: UserRef
    course: CourseRef
    stats: Stats
    settings: Settings
    server_now: datetime
