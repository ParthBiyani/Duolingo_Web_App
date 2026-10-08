"""ORM models. Importing this package registers all 23 tables on ``Base.metadata``."""

from app.models.base import Base
from app.models.catalog import Achievement, AppSetting, ShopItem, UserAchievement
from app.models.content import (
    Course,
    Exercise,
    ExerciseAnswer,
    ExerciseOption,
    Lesson,
    Skill,
    Unit,
)
from app.models.league import League, LeagueCohort, LeagueMembership
from app.models.learner import SkillProgress, User, UserSettings, UserStats
from app.models.ledger import DailyActivity, GemTransaction, XpEvent
from app.models.session import LessonSession, SessionAnswer

__all__ = [
    "Achievement",
    "AppSetting",
    "Base",
    "Course",
    "DailyActivity",
    "Exercise",
    "ExerciseAnswer",
    "ExerciseOption",
    "GemTransaction",
    "League",
    "LeagueCohort",
    "LeagueMembership",
    "Lesson",
    "LessonSession",
    "SessionAnswer",
    "ShopItem",
    "Skill",
    "SkillProgress",
    "Unit",
    "User",
    "UserAchievement",
    "UserSettings",
    "UserStats",
    "XpEvent",
]
