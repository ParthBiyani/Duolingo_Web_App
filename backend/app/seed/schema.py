"""Pydantic models for the course content files (``content/unit_<n>.yaml``, one per unit).

Validation happens before anything is written, so a mistake in the YAML stops the seed with a
message that points at the field instead of producing a half-built course.
"""

from pathlib import Path
from typing import Annotated, Literal, Self

import yaml
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

CONTENT_DIR = Path(__file__).resolve().parent / "content"

# Path order of the nodes in every unit.
SKILL_ORDER = ("lesson", "lesson", "chest", "lesson", "lesson", "unit_review")

Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=60)]
Phrase = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class ContentModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class VocabItem(ContentModel):
    es: Phrase
    en: Phrase
    emoji: str | None = None  # only for picturable words; image_choice exercises use it

    @field_validator("emoji")
    @classmethod
    def _single_emoji(cls, value: str | None) -> str | None:
        # A real grapheme check needs a third-party library. This catches the likely mistakes
        # (a word, a space, an empty string) while allowing ZWJ sequences, flags and keycaps.
        if value is not None and (
            not value
            or len(value) > 10
            or any(c.isspace() or (c.isascii() and c.isalpha()) for c in value)
        ):
            raise ValueError("emoji must be a single emoji glyph")
        return value


class SentencePair(ContentModel):
    es: Phrase
    en: Phrase
    alt_en: tuple[Phrase, ...] = ()  # other accepted English translations
    alt_es: tuple[Phrase, ...] = ()  # other accepted Spanish translations


class LessonSkill(ContentModel):
    slug: Slug
    type: Literal["lesson"]
    title: Phrase
    icon: Literal["star"]
    vocab: tuple[VocabItem, ...] = Field(min_length=8, max_length=10)
    sentences: tuple[SentencePair, ...] = Field(min_length=6, max_length=8)


class ChestSkill(ContentModel):
    slug: Slug
    type: Literal["chest"]
    title: Phrase
    icon: Literal["chest"]
    chest_gems: int = Field(gt=0)


class ReviewSkill(ContentModel):
    slug: Slug
    type: Literal["unit_review"]
    title: Phrase
    icon: Literal["trophy"]


SkillEntry = Annotated[LessonSkill | ChestSkill | ReviewSkill, Field(discriminator="type")]


class UnitInfo(ContentModel):
    slug: Slug
    section: int = Field(ge=1)
    position: int = Field(ge=1)
    title: Phrase
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
    ]
    color: Literal["green", "purple", "blue", "orange", "red"]


class UnitFile(ContentModel):
    unit: UnitInfo
    skills: tuple[SkillEntry, ...]

    @model_validator(mode="after")
    def _check_unit(self) -> Self:
        order = tuple(skill.type for skill in self.skills)
        if order != SKILL_ORDER:
            raise ValueError(f"skills must be in the order {list(SKILL_ORDER)}, got {list(order)}")
        seen: set[str] = set()
        for skill in self.lesson_skills:
            for item in skill.vocab:
                word = item.es.casefold()
                if word in seen:
                    raise ValueError(f"vocabulary word {item.es!r} appears twice in the unit")
                seen.add(word)
        return self

    @property
    def lesson_skills(self) -> list[LessonSkill]:
        return [skill for skill in self.skills if isinstance(skill, LessonSkill)]


def load_unit_file(path: Path) -> UnitFile:
    with path.open(encoding="utf-8") as handle:
        return UnitFile.model_validate(yaml.safe_load(handle))


def load_units(content_dir: Path = CONTENT_DIR) -> list[UnitFile]:
    """Load and validate every ``unit_*.yaml`` in ``content_dir``, in path order."""
    paths = sorted(content_dir.glob("unit_*.yaml"))
    if not paths:
        raise FileNotFoundError(f"no unit_*.yaml files in {content_dir}")
    units = sorted((load_unit_file(path) for path in paths), key=lambda unit: unit.unit.position)

    positions = [unit.unit.position for unit in units]
    if positions != list(range(1, len(units) + 1)):
        raise ValueError(f"unit positions must be 1..{len(units)}, got {positions}")
    slugs = [unit.unit.slug for unit in units]
    slugs += [skill.slug for unit in units for skill in unit.skills]
    duplicates = sorted({slug for slug in slugs if slugs.count(slug) > 1})
    if duplicates:
        raise ValueError(f"slugs must be unique across units, repeated: {duplicates}")
    return units
