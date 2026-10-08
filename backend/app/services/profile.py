"""Profile statistics and the daily-goal quest."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.domain import dates
from app.domain.goals import GOAL_CHEST_GEMS
from app.domain.leagues import get_tier
from app.models import User
from app.schemas.profile import DailyQuest, ProfileResponse, ProfileStats, QuestsResponse
from app.services import achievements
from app.services.common import (
    activity_for,
    course_ref,
    current_course,
    settle,
    today_for,
    user_ref,
)
from app.services.learner import leaderboard_unlocked


def get_profile(db: Session, now: datetime, user: User) -> ProfileResponse:
    stats = settle(db, user, now)
    response = ProfileResponse(
        user=user_ref(user),
        course=course_ref(current_course(db, user)),
        stats=ProfileStats(
            streak=stats.streak_current,
            xp_total=stats.xp_total,
            league_name=get_tier(stats.league_tier).name if leaderboard_unlocked(user) else None,
            top3_finishes=stats.top3_finishes,
        ),
        achievements=achievements.views(db, user),
    )
    db.commit()
    return response


def get_quests(db: Session, now: datetime, user: User) -> QuestsResponse:
    settle(db, user, now)
    today = today_for(user, now)
    activity = activity_for(db, user, today)
    goal = user.settings.daily_goal_xp
    response = QuestsResponse(
        ends_at=dates.local_midnight_utc(today + timedelta(days=1), user.timezone),
        daily=[
            DailyQuest(
                key="daily_goal",
                title=f"Earn {goal} XP",
                progress=min(activity.xp, goal),
                target=goal,
                completed=activity.xp >= goal,
                chest_gems=GOAL_CHEST_GEMS,
            )
        ],
        server_now=now,
    )
    db.commit()
    return response
