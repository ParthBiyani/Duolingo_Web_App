"""Stores the course content: units, path nodes, lessons and their generated exercises."""

from collections.abc import Sequence
from dataclasses import asdict

from sqlalchemy.orm import Session

from app.models import Course, Exercise, ExerciseAnswer, ExerciseOption, Lesson, Skill, Unit
from app.seed.generator import ExerciseSpec, LessonSpec, lessons_for
from app.seed.schema import ChestSkill, UnitFile


def seed_course_content(session: Session, course: Course, units: Sequence[UnitFile]) -> None:
    """Add the units to ``course`` with their path nodes, lessons and exercises."""
    for unit_file in units:
        info = unit_file.unit
        unit = Unit(
            section=info.section,
            position=info.position,
            slug=info.slug,
            title=info.title,
            description=info.description,
            color=info.color,
        )
        course.units.append(unit)
        for position, entry in enumerate(unit_file.skills, start=1):
            skill = Skill(
                position=position,
                slug=entry.slug,
                type=entry.type,
                title=entry.title,
                icon=entry.icon,
                chest_gems=entry.chest_gems if isinstance(entry, ChestSkill) else None,
            )
            unit.skills.append(skill)
            skill.lessons.extend(
                _lesson(entry.slug, spec) for spec in lessons_for(entry, unit_file)
            )
    session.flush()


def _lesson(skill_slug: str, spec: LessonSpec) -> Lesson:
    return Lesson(
        position=spec.position,
        slug=f"{skill_slug}-{spec.position}",
        exercises=[
            _exercise(position, exercise)
            for position, exercise in enumerate(spec.exercises, start=1)
        ],
    )


def _exercise(position: int, spec: ExerciseSpec) -> Exercise:
    return Exercise(
        position=position,
        type=spec.type,
        prompt=spec.prompt,
        source_text=spec.source_text,
        source_lang=spec.source_lang,
        tts_text=spec.tts_text,
        is_new_word=spec.is_new_word,
        # OptionSpec's fields are named after the exercise_options columns.
        options=[ExerciseOption(**asdict(option)) for option in spec.options],
        answers=[
            ExerciseAnswer(text=text, is_canonical=index == 0)
            for index, text in enumerate(spec.answers)
        ],
    )
