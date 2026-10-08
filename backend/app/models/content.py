"""Course content: courses, units, path nodes (skills), lessons, exercises and their answers."""

from __future__ import annotations

from typing import Literal, get_args

from sqlalchemy import CheckConstraint, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, check_bool, check_in, int_default

UnitColor = Literal["green", "purple", "blue", "orange", "red"]
SkillType = Literal["lesson", "chest", "practice", "unit_review"]
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
Language = Literal["es", "en"]
OptionRole = Literal["choice", "tile", "pair_left", "pair_right"]


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (check_bool("is_available"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(unique=True)
    learning_language: Mapped[str]
    from_language: Mapped[str]
    title: Mapped[str]
    is_available: Mapped[bool] = mapped_column(server_default=int_default(1))

    units: Mapped[list[Unit]] = relationship(
        back_populates="course", order_by="Unit.position", passive_deletes=True
    )


class Unit(Base):
    __tablename__ = "units"
    __table_args__ = (
        UniqueConstraint("course_id", "position"),
        CheckConstraint("section >= 1", name="section_min"),
        CheckConstraint("position >= 1", name="position_min"),
        check_in("color", get_args(UnitColor)),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    section: Mapped[int]
    position: Mapped[int]
    slug: Mapped[str] = mapped_column(unique=True)
    title: Mapped[str]
    description: Mapped[str]
    color: Mapped[UnitColor] = mapped_column(Text)

    course: Mapped[Course] = relationship(back_populates="units")
    skills: Mapped[list[Skill]] = relationship(
        back_populates="unit", order_by="Skill.position", passive_deletes=True
    )


class Skill(Base):
    """A node on the learning path: a lesson skill, a chest, a practice node or a unit review."""

    __tablename__ = "skills"
    __table_args__ = (
        UniqueConstraint("unit_id", "position"),
        CheckConstraint("position >= 1", name="position_min"),
        check_in("type", get_args(SkillType)),
        CheckConstraint("chest_gems IS NULL OR chest_gems > 0", name="chest_gems_positive"),
        CheckConstraint(
            "(type = 'chest') = (chest_gems IS NOT NULL)", name="chest_gems_for_chests"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"))
    position: Mapped[int]
    slug: Mapped[str] = mapped_column(unique=True)
    type: Mapped[SkillType] = mapped_column(Text)
    title: Mapped[str]
    icon: Mapped[str]
    chest_gems: Mapped[int | None]

    unit: Mapped[Unit] = relationship(back_populates="skills")
    lessons: Mapped[list[Lesson]] = relationship(
        back_populates="skill", order_by="Lesson.position", passive_deletes=True
    )


class Lesson(Base):
    __tablename__ = "lessons"
    __table_args__ = (
        UniqueConstraint("skill_id", "position"),
        CheckConstraint("position >= 1", name="position_min"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    position: Mapped[int]
    slug: Mapped[str] = mapped_column(unique=True)

    skill: Mapped[Skill] = relationship(back_populates="lessons")
    exercises: Mapped[list[Exercise]] = relationship(
        back_populates="lesson", order_by="Exercise.position", passive_deletes=True
    )


class Exercise(Base):
    __tablename__ = "exercises"
    __table_args__ = (
        UniqueConstraint("lesson_id", "position"),
        CheckConstraint("position >= 1", name="position_min"),
        check_in("type", get_args(ExerciseType)),
        check_in("source_lang", get_args(Language)),
        check_bool("is_new_word"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"))
    position: Mapped[int]
    type: Mapped[ExerciseType] = mapped_column(Text)
    prompt: Mapped[str]  # instruction, e.g. "Write this in English"
    source_text: Mapped[str | None]  # speech-bubble text, or the gap sentence with "___"
    source_lang: Mapped[Language | None] = mapped_column(Text)
    tts_text: Mapped[str | None]  # Spanish text the speaker button reads aloud
    is_new_word: Mapped[bool] = mapped_column(server_default=int_default(0))

    lesson: Mapped[Lesson] = relationship(back_populates="exercises")
    options: Mapped[list[ExerciseOption]] = relationship(
        back_populates="exercise",
        order_by="[ExerciseOption.role, ExerciseOption.position]",
        passive_deletes=True,
    )
    answers: Mapped[list[ExerciseAnswer]] = relationship(
        back_populates="exercise", order_by="ExerciseAnswer.id", passive_deletes=True
    )


class ExerciseOption(Base):
    """A choice, a word-bank tile, or one side of a matching pair.

    - ``choice``: ``is_correct`` marks the right one (``image_key`` holds the picture's emoji).
    - ``tile``: ``answer_position`` is the tile's place in the canonical answer; distractor
      tiles have none.
    - ``pair_left`` / ``pair_right``: the two halves of a pair share a ``pair_key``.
    """

    __tablename__ = "exercise_options"
    __table_args__ = (
        UniqueConstraint("exercise_id", "role", "position"),
        check_in("role", get_args(OptionRole)),
        CheckConstraint("position >= 0", name="position_min"),
        check_bool("is_correct"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"))
    role: Mapped[OptionRole] = mapped_column(Text)
    position: Mapped[int]  # display order within the role
    text: Mapped[str]
    image_key: Mapped[str | None]
    is_correct: Mapped[bool] = mapped_column(server_default=int_default(0))
    pair_key: Mapped[int | None]
    answer_position: Mapped[int | None]

    exercise: Mapped[Exercise] = relationship(back_populates="options")


class ExerciseAnswer(Base):
    """An accepted answer for a typed or built answer; the canonical one is shown as solution."""

    __tablename__ = "exercise_answers"
    __table_args__ = (UniqueConstraint("exercise_id", "text"), check_bool("is_canonical"))

    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"))
    text: Mapped[str]
    is_canonical: Mapped[bool] = mapped_column(server_default=int_default(0))

    exercise: Mapped[Exercise] = relationship(back_populates="answers")
