"""Grading of typed answers, forgiving about case, punctuation, accents and small slips."""

import unicodedata
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

GradeOutcome = Literal["correct", "typo", "incorrect"]

# A one-character slip only counts as a typo when both texts are at least this long. Short
# words turn into different words too easily ("gato" and "gata", "pero" and "perro").
TYPO_MIN_LENGTH = 5

# Punctuation a learner may leave out or get wrong, plus the typographic quotes that phone
# keyboards and Spanish texts use instead of the straight ones.
_IGNORED_PUNCTUATION = (
    ".,!?¿¡;:\"'"
    "\N{LEFT SINGLE QUOTATION MARK}\N{RIGHT SINGLE QUOTATION MARK}"
    "\N{LEFT DOUBLE QUOTATION MARK}\N{RIGHT DOUBLE QUOTATION MARK}"
    "\N{LEFT-POINTING DOUBLE ANGLE QUOTATION MARK}\N{RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK}"
)
_REMOVE_PUNCTUATION = str.maketrans("", "", _IGNORED_PUNCTUATION)


@dataclass(frozen=True)
class GradeResult:
    outcome: GradeOutcome
    canonical: str  # the preferred answer, shown to the learner as the solution


def normalize(text: str) -> str:
    """Reduce an answer to the form used for comparison.

    NFKC first folds compatibility characters (full-width letters, the one-character
    ellipsis) and composes accents, so "é" typed as one or two code points compares equal.
    Then: lowercase, drop the ignored punctuation and collapse runs of whitespace.
    """
    text = unicodedata.normalize("NFKC", text).lower().translate(_REMOVE_PUNCTUATION)
    return " ".join(text.split())


def strip_accents(text: str) -> str:
    """Remove diacritics: "canción" becomes "cancion" and "niño" becomes "nino"."""
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def damerau_levenshtein(a: str, b: str) -> int:
    """Count the edits that turn ``a`` into ``b``.

    An edit inserts, deletes or substitutes one character, or swaps two adjacent ones. This
    is the restricted ("optimal string alignment") variant of the distance; it agrees with
    the unrestricted one on whether two texts are within one edit, which is all grading needs.
    """
    dist = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1):
        dist[i][0] = i
    for j in range(len(b) + 1):
        dist[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dist[i][j] = min(
                dist[i - 1][j] + 1,  # delete
                dist[i][j - 1] + 1,  # insert
                dist[i - 1][j - 1] + cost,  # substitute (free when the characters match)
            )
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                dist[i][j] = min(dist[i][j], dist[i - 2][j - 2] + 1)  # swap adjacent pair
    return dist[len(a)][len(b)]


def grade_text(answer: str, accepted: Sequence[str]) -> GradeResult:
    """Grade a typed answer against the accepted answers; ``accepted[0]`` is canonical.

    - correct: equal to an accepted answer once both are normalised;
    - typo: differs from one only in accents, or by one edit when both are 5+ characters;
    - incorrect: anything else.
    """
    if isinstance(accepted, str):
        # A str is itself a Sequence[str]; accepted[0] would silently be its first letter.
        raise TypeError("accepted must be a sequence of answers, not a single string")
    if not accepted:
        raise ValueError("accepted must contain at least one answer")
    canonical = accepted[0]
    given = normalize(answer)
    targets = [normalize(option) for option in accepted]
    if given in targets:
        return GradeResult("correct", canonical)
    if any(_is_typo(given, target) for target in targets):
        return GradeResult("typo", canonical)
    return GradeResult("incorrect", canonical)


def _is_typo(given: str, target: str) -> bool:
    """Whether two different normalised texts are close enough to call the difference a typo.

    Accents are compared away first, so a missing accent never costs the learner anything,
    even next to another slip.
    """
    plain_given, plain_target = strip_accents(given), strip_accents(target)
    if plain_given == plain_target:
        return True
    long_enough = min(len(plain_given), len(plain_target)) >= TYPO_MIN_LENGTH
    return long_enough and damerau_levenshtein(plain_given, plain_target) <= 1
