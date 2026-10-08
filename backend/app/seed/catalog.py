"""Catalogue rows: the courses, the ten leagues, the six achievements and the shop items.

Leagues and achievements are copied from the rule definitions in ``app.domain``, so the
database and the rules can never disagree about a threshold or a reward.
"""

from sqlalchemy.orm import Session

from app.domain.achievements import ACHIEVEMENTS, GEMS_PER_LEVEL
from app.domain.leagues import TIERS
from app.models import Achievement, Course, League, ShopItem

SPANISH_COURSE_SLUG = "es-en"

# (slug, learning language, title, has content). The others show as "coming soon".
COURSES = (
    (SPANISH_COURSE_SLUG, "es", "Spanish", True),
    ("fr-en", "fr", "French", False),
    ("de-en", "de", "German", False),
    ("ja-en", "ja", "Japanese", False),
    ("it-en", "it", "Italian", False),
    ("pt-en", "pt", "Portuguese", False),
)

HEART_REFILL_PRICE = 350
HEART_REFILL_IN_LESSON_PRICE = 450  # from the out-of-hearts dialog
STREAK_FREEZE_PRICE = 200
LEGENDARY_ENTRY_PRICE = 100


def seed_catalog(session: Session) -> Course:
    """Insert the catalogue and return the Spanish course (the only one with content)."""
    courses = [
        Course(slug=slug, learning_language=lang, from_language="en", title=title, is_available=ok)
        for slug, lang, title, ok in COURSES
    ]
    session.add_all(courses)
    session.add_all(
        League(
            tier=tier.tier,
            name=tier.name,
            color=tier.color,
            promote_count=tier.promote,
            demote_count=tier.demote,
            reward_gems=list(tier.rewards),
        )
        for tier in TIERS
    )
    session.add_all(
        Achievement(
            key=definition.key,
            name=definition.name,
            description=definition.description,
            metric=definition.metric,
            thresholds=list(definition.thresholds),
            gems_per_level=GEMS_PER_LEVEL,
            color=definition.color,
            position=position,
        )
        for position, definition in enumerate(ACHIEVEMENTS, start=1)
    )
    session.add_all(_shop_items())
    session.flush()
    return courses[0]


def _shop_items() -> list[ShopItem]:
    return [
        ShopItem(
            key="heart_refill",
            name="Heart refill",
            description="Get full hearts so you can keep learning without worrying about mistakes.",
            price_gems=HEART_REFILL_PRICE,
            in_lesson_price_gems=HEART_REFILL_IN_LESSON_PRICE,
            is_available=True,
        ),
        ShopItem(
            key="streak_freeze",
            name="Streak freeze",
            description="Keeps your streak alive through one full day without practice. "
            "You can hold up to 2 at a time.",
            price_gems=STREAK_FREEZE_PRICE,
            is_available=True,
        ),
        ShopItem(
            key="legendary_entry",
            name="Legendary challenge",
            description="Take on a Legendary challenge to prove you have mastered a skill.",
            price_gems=LEGENDARY_ENTRY_PRICE,
            is_available=True,
        ),
        ShopItem(
            key="unlimited_hearts",
            name="Unlimited hearts",
            description="Learn without ever running out of hearts. Coming soon.",
            is_available=False,
        ),
    ]
