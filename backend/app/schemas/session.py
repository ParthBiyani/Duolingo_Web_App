from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import ApiModel, ExerciseType, Outcome, SessionKind, StreakDay


class Option(ApiModel):
    id: int
    text: str
    image: str | None


class Tile(ApiModel):
    id: int
    text: str


class Pairs(ApiModel):
    left: list[Tile]
    right: list[Tile]


class Exercise(ApiModel):
    """An exercise as sent to the browser. It never contains the answer."""

    id: int
    type: ExerciseType
    prompt: str
    source_text: str | None
    source_lang: Literal["es", "en"] | None
    tts_text: str | None
    is_new_word: bool
    options: list[Option]
    tiles: list[Tile]
    pairs: Pairs | None


class SessionRules(ApiModel):
    hearts_enabled: bool
    mistakes_allowed: int | None
    timer_seconds: int | None
    timer_bonus_seconds: int | None


class SessionCreate(ApiModel):
    id: UUID
    kind: SessionKind
    skill_id: int | None = None
    lesson_id: int | None = None


class SessionResponse(ApiModel):
    id: str
    kind: SessionKind
    skill_id: int | None
    lesson_id: int | None
    lesson_position: int | None
    lessons_total: int | None
    hearts: int
    hearts_max: int
    exercises: list[Exercise]
    rules: SessionRules
    started_at: datetime
    server_now: datetime


class OptionAnswer(ApiModel):
    option_id: int


class TilesAnswer(ApiModel):
    tile_ids: Annotated[list[int], Field(min_length=1, max_length=30)]


class TextAnswer(ApiModel):
    text: Annotated[str, Field(max_length=200)]


class PairAnswer(ApiModel):
    pair: tuple[int, int]


class SkipAnswer(ApiModel):
    skipped: Literal[True]


Answer = OptionAnswer | TilesAnswer | TextAnswer | PairAnswer | SkipAnswer


class AnswerCreate(ApiModel):
    answer_id: UUID
    exercise_id: int
    answer: Answer


class AnswerResult(ApiModel):
    outcome: Outcome
    correct: bool
    solution_display: str | None
    hearts: int
    next_heart_at: datetime | None
    out_of_hearts: bool
    exercise_done: bool
    pair_matched: bool | None
    mistakes_left: int | None


class XpSummary(ApiModel):
    base: int
    combo_bonus: int
    total: int


class StreakSummary(ApiModel):
    extended: bool
    previous: int
    current: int
    milestone: bool
    week: list[StreakDay]


class GoalSummary(ApiModel):
    goal_xp: int
    today_xp: int
    reached_now: bool
    chest_gems: int


class SkillSummary(ApiModel):
    id: int
    lessons_completed: int
    lessons_total: int
    completed_now: bool
    crown_level: Literal[0, 1, 2]


class AchievementUnlock(ApiModel):
    key: str
    name: str
    level: int
    gems: int
    description: str


class LeagueSummary(ApiModel):
    tier: int
    name: str
    rank: int | None


class CompletionResult(ApiModel):
    session_id: str
    kind: SessionKind
    xp: XpSummary
    accuracy_pct: int
    duration_seconds: int
    hearts: int
    hearts_earned: int
    gems: int
    streak: StreakSummary
    daily_goal: GoalSummary
    skill: SkillSummary | None
    achievements: list[AchievementUnlock]
    league: LeagueSummary
