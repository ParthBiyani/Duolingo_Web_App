"""Achievement levels: computed from learner stats, with gems paid once per level."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.achievements import GEMS_PER_LEVEL, level_for
from app.models import Achievement, DailyActivity, User, UserAchievement
from app.schemas.profile import AchievementView
from app.schemas.session import AchievementUnlock
from app.services.common import add_gems, load_json

LEADERBOARD_UNLOCK_LESSONS = 10


def metric_value(db: Session, user: User, metric: str) -> int:
    stats = user.stats
    if metric == "streak":
        return max(stats.streak_longest, stats.streak_current)
    if metric == "xp_total":
        return stats.xp_total
    if metric == "perfect_lessons":
        return stats.perfect_lessons
    if metric == "league_tier":
        # Level 1 for unlocking the leaderboard, then one level per tier reached.
        return 0 if stats.lessons_completed < LEADERBOARD_UNLOCK_LESSONS else stats.league_tier + 1
    if metric == "daily_xp":
        best = db.scalar(select(func.max(DailyActivity.xp)).where(DailyActivity.user_id == user.id))
        return int(best or 0)
    if metric == "legendary_skills":
        return stats.legendary_skills
    raise ValueError(f"unknown achievement metric: {metric}")


def _definitions(db: Session) -> list[Achievement]:
    return list(db.scalars(select(Achievement).order_by(Achievement.position)).all())


def evaluate(db: Session, user: User, now: datetime) -> list[AchievementUnlock]:
    """Raise stored levels to match current stats and pay gems for every level gained."""
    stored = {
        row.achievement_id: row
        for row in db.scalars(
            select(UserAchievement).where(UserAchievement.user_id == user.id)
        ).all()
    }
    unlocked: list[AchievementUnlock] = []
    for definition in _definitions(db):
        thresholds = [int(t) for t in load_json(definition.thresholds)]
        level, progress, _target = level_for(metric_value(db, user, definition.metric), thresholds)
        row = stored.get(definition.id)
        if row is None:
            row = UserAchievement(
                user_id=user.id, achievement_id=definition.id, level=0, progress=0, updated_at=now
            )
            db.add(row)
        for gained in range(row.level + 1, level + 1):
            add_gems(
                db,
                user,
                definition.gems_per_level or GEMS_PER_LEVEL,
                "achievement",
                now,
                ref=f"achievement:{definition.key}:{gained}",
            )
            unlocked.append(
                AchievementUnlock(
                    key=definition.key,
                    name=definition.name,
                    level=gained,
                    gems=definition.gems_per_level or GEMS_PER_LEVEL,
                    description=definition.description.replace("{n}", str(thresholds[gained - 1])),
                )
            )
        if level != row.level or progress != row.progress:
            row.level, row.progress, row.updated_at = level, progress, now
    return unlocked


def views(db: Session, user: User) -> list[AchievementView]:
    result: list[AchievementView] = []
    for definition in _definitions(db):
        thresholds = [int(t) for t in load_json(definition.thresholds)]
        level, progress, target = level_for(metric_value(db, user, definition.metric), thresholds)
        shown_target = thresholds[min(level, len(thresholds) - 1)]
        result.append(
            AchievementView(
                key=definition.key,
                name=definition.name,
                description=definition.description.replace("{n}", str(shown_target)),
                level=level,
                max_level=len(thresholds),
                progress=progress,
                target=target,
                color=definition.color,
            )
        )
    return result
