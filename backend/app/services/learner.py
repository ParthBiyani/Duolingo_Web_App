"""The current learner: profile header data, settled stats and preferences."""

from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.domain.hearts import MAX_HEARTS
from app.domain.leagues import get_tier
from app.models import User
from app.schemas.me import (
    LeagueStats,
    MeResponse,
    MeUpdate,
    Settings,
    SettingsUpdate,
    Stats,
    StreakStats,
)
from app.services.common import (
    activity_for,
    course_ref,
    current_course,
    next_heart,
    settle,
    streak_week,
    today_for,
    user_ref,
)

LEADERBOARD_UNLOCK_LESSONS = 10


def settings_of(user: User) -> Settings:
    s = user.settings
    return Settings(
        sound_effects=s.sound_effects,
        animations=s.animations,
        motivational_messages=s.motivational_messages,
        listening_exercises=s.listening_exercises,
        theme=s.theme,
        daily_goal_xp=s.daily_goal_xp,
    )


def leaderboard_unlocked(user: User) -> bool:
    return user.stats.lessons_completed >= LEADERBOARD_UNLOCK_LESSONS


def build_me(db: Session, now: datetime, user: User) -> MeResponse:
    stats = user.stats
    today = today_for(user, now)
    activity = activity_for(db, user, today)
    tier = get_tier(stats.league_tier)
    week = streak_week(db, user, now)
    extended_today = any(day.date == today.isoformat() and day.status == "extended" for day in week)
    return MeResponse(
        user=user_ref(user),
        course=course_ref(current_course(db, user)),
        stats=Stats(
            xp_total=stats.xp_total,
            today_xp=activity.xp,
            daily_goal_xp=user.settings.daily_goal_xp,
            gems=stats.gems,
            hearts=stats.hearts,
            hearts_max=MAX_HEARTS,
            next_heart_at=next_heart(stats),
            streak=StreakStats(
                current=stats.streak_current,
                longest=stats.streak_longest,
                extended_today=extended_today,
                freezes=stats.streak_freezes,
                week=week,
            ),
            league=LeagueStats(tier=tier.tier, name=tier.name, unlocked=leaderboard_unlocked(user)),
        ),
        settings=settings_of(user),
        server_now=now,
    )


def get_me(db: Session, now: datetime, user: User) -> MeResponse:
    settle(db, user, now)
    response = build_me(db, now, user)
    db.commit()
    return response


def update_me(db: Session, now: datetime, user: User, body: MeUpdate) -> MeResponse:
    settle(db, user, now)
    if body.timezone is not None:
        try:
            ZoneInfo(body.timezone)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise AppError(422, "invalid_timezone", "Invalid time zone", body.timezone) from exc
        user.timezone = body.timezone
    if body.daily_goal_xp is not None:
        user.settings.daily_goal_xp = body.daily_goal_xp
        activity_for(db, user, today_for(user, now)).goal_xp = body.daily_goal_xp
    response = build_me(db, now, user)
    db.commit()
    return response


def update_settings(db: Session, user: User, body: SettingsUpdate) -> Settings:
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user.settings, field, value)
    db.commit()
    return settings_of(user)
