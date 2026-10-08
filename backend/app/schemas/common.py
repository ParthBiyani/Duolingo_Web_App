from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

Theme = Literal["system", "light", "dark"]
DailyGoal = Literal[1, 10, 20, 30, 50]
UnitColor = Literal["green", "purple", "blue", "orange", "red"]
NodeType = Literal["lesson", "chest", "practice", "unit_review"]
NodeIcon = Literal["star", "chest", "dumbbell", "trophy"]
NodeStateName = Literal["locked", "active", "completed", "legendary"]
SessionKind = Literal["lesson", "practice", "review", "legendary", "timed"]
ExerciseType = Literal[
    "multiple_choice",
    "image_choice",
    "translate_word_bank",
    "match_pairs",
    "fill_blank",
    "type_answer",
    "listen_type",
    "speak",
]
Outcome = Literal["correct", "typo", "incorrect", "skipped"]
Zone = Literal["promotion", "safe", "demotion"]
DayStatus = Literal["extended", "frozen", "missed", "pending", "future"]


class ApiModel(BaseModel):
    """Base for all API models: exact field names, unknown keys rejected."""

    model_config = ConfigDict(extra="forbid")


class StreakDay(ApiModel):
    date: str
    label: str
    status: DayStatus


class CourseRef(ApiModel):
    id: int
    title: str
    learning_language: str
    from_language: str


class UserRef(ApiModel):
    id: int
    username: str
    display_name: str
    avatar_color: str
    timezone: str
    joined_at: datetime


class Problem(ApiModel):
    """RFC 9457 problem details body used for every error response."""

    type: str = "about:blank"
    title: str
    status: int
    detail: str
    code: str
