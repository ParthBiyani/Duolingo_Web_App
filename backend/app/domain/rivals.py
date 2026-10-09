"""League rivals: who the n-th simulated learner is, the same on every run.

Rivals fill the seats in a league cohort that no real learner has taken. They are created on
demand, numbered from 0 in the order they are needed, and the number alone decides the name,
the avatar colour and the weekly XP pace, so a fresh seed or a demo reset always brings back
the same rivals.
"""

import random
import string
import unicodedata
from dataclasses import dataclass

# Fictional first names with a last initial.
RIVAL_NAMES = (
    ("Maya", "R"), ("Liam", "K"), ("Sofia", "M"), ("Arjun", "S"), ("Chloe", "B"),
    ("Mateo", "G"), ("Aisha", "N"), ("Noah", "W"), ("Elena", "P"), ("Kenji", "T"),
    ("Priya", "D"), ("Lucas", "F"), ("Zara", "H"), ("Omar", "A"), ("Hana", "Y"),
    ("Diego", "L"), ("Leila", "C"), ("Ethan", "J"), ("Nadia", "V"), ("Ravi", "E"),
    ("Isla", "O"), ("Tomás", "Q"), ("Mei", "Z"), ("Samuel", "I"), ("Freya", "U"),
    ("Kofi", "X"), ("Lena", "R"), ("Yusuf", "B"), ("Inés", "M"),
)  # fmt: skip

AVATAR_COLORS = (
    "#58CC02", "#CE82FF", "#FF9600", "#FF4B4B", "#1CB0F6",
    "#FFC800", "#2B70C9", "#FF86D0", "#00CD9C", "#A568CC",
)  # fmt: skip

# Weekly XP paces between 40 and 600, one per name. Eleven of them out-pace a learner's usual
# 250-300 XP a week and eighteen do not, so a typical learner lands in the middle of the table.
RIVAL_PACES = (
    40, 50, 60, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165, 175, 185, 195, 205, 215,
    320, 340, 360, 380, 400, 430, 460, 490, 520, 560, 600,
)  # fmt: skip


def _shuffled_paces() -> tuple[int, ...]:
    """The paces in a fixed shuffled order, so a rival's name says nothing about their pace."""
    paces = list(RIVAL_PACES)
    random.Random("league-rivals").shuffle(paces)
    return tuple(paces)


_PACES = _shuffled_paces()


@dataclass(frozen=True)
class Rival:
    username: str
    display_name: str
    avatar_color: str
    pace_xp: int  # average XP per week


def rival(number: int) -> Rival:
    """Return rival ``number`` (0-based).

    The first 29 rivals use the names as written. After that the names come round again with
    the next letter as the initial (Maya R. becomes Maya S.), and after 26 rounds a number is
    added to the username, so usernames never repeat.
    """
    if number < 0:
        raise ValueError(f"rival numbers start at 0, got {number}")
    round_, slot = divmod(number, len(RIVAL_NAMES))
    first_name, initial = RIVAL_NAMES[slot]
    letters = string.ascii_uppercase
    initial = letters[(letters.index(initial) + round_) % len(letters)]
    suffix = str(round_ // len(letters)) if round_ >= len(letters) else ""
    return Rival(
        username=_username(first_name, initial) + suffix,
        display_name=f"{first_name} {initial}.",
        avatar_color=AVATAR_COLORS[number % len(AVATAR_COLORS)],
        pace_xp=_PACES[slot],
    )


def _username(first_name: str, initial: str) -> str:
    """``Tomás``, ``Q`` -> ``tomas_q``: lowercase ASCII, accents dropped."""
    plain = unicodedata.normalize("NFKD", first_name).encode("ascii", "ignore").decode()
    return f"{plain}_{initial}".lower()
