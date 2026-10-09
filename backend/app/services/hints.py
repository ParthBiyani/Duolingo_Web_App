"""Word hints for Spanish sentences: the dotted-underline glosses shown in the speech bubble.

The glossary is built once from the course vocabulary (``seed/content/unit_*.yaml``) plus the
small function words the sentences use. A hint is the meaning of one word or set phrase, never
the translation of the whole sentence, so it gives nothing away that a dictionary would not.
"""

import re
from dataclasses import dataclass
from functools import cache

from app.seed.schema import load_units

# Same word shape as the exercise generator: letters and digits, joined by an apostrophe or hyphen.
WORD = re.compile(r"[^\W_]+(?:['\N{RIGHT SINGLE QUOTATION MARK}-][^\W_]+)*")
ARTICLES = frozenset({"el", "la", "los", "las"})

# Words and phrases the sentences use that are not taught as vocabulary.
BASE_GLOSSES: dict[str, str] = {
    "a": "to",
    "al": "to the",
    "abre": "opens",
    "aceptan": "they accept",
    "arriba": "upstairs",
    "bebe": "drinks",
    "busco": "I look for",
    "carro": "car",
    "cielo": "sky",
    "come": "eats",
    "con": "with",
    "cuesta": "costs",
    "de": "of",
    "día": "day",
    "dónde": "where",
    "ducho": "shower",
    "dulces": "sweet",
    "el": "the",
    "ella": "she",
    "en": "in",
    "encuentro": "I find",
    "es": "is",
    "está": "is",
    "euros": "euros",
    "favorito": "favourite",
    "fresas": "strawberries",
    "grandes": "big",
    "gusta": "likes",
    "hace": "it is",
    "hay": "there is",
    "hermanos": "brothers",
    "ir": "to go",
    "juegan": "they play",
    "la": "the",
    "las": "the",
    "leo": "I read",
    "lleva": "wears",
    "llega": "arrives",
    "llueve": "it rains",
    "los": "the",
    "manzanas": "apples",
    "me": "me",
    "mi": "my",
    "mira": "look",
    "mis": "my",
    "mí": "me",
    "mucha": "a lot of",
    "necesito": "I need",
    "no": "no",
    "nosotros": "we",
    "para": "for",
    "pequeña": "small",
    "plátanos": "bananas",
    "qué": "what",
    "quieres": "you want",
    "quiero": "I want",
    "sale": "leaves",
    "se": "himself",
    "solo": "only",
    "son": "are",
    "soy": "I am",
    "sí": "yes",
    "tarjetas": "cards",
    "te": "you",
    "tengo": "I have",
    "ti": "you",
    "tiene": "has",
    "tienes": "you have",
    "tomamos": "we take",
    "tomates": "tomatoes",
    "tomo": "I take",
    "tú": "you",
    "un": "a",
    "una": "a",
    "va": "goes",
    "vamos": "we go",
    "voy": "I go",
    "y": "and",
    "yo": "I",
    "zanahorias": "carrots",
    # Set phrases read as one unit.
    "me gusta": "I like",
    "te gusta": "you like",
    "por favor": "please",
    "se llama": "is called",
}


@dataclass(frozen=True, slots=True)
class Token:
    """A slice of the sentence; joining every token's text gives the sentence back."""

    text: str
    hint: str | None


def _strip_article(meaning: str) -> str:
    return meaning[4:] if meaning.casefold().startswith("the ") else meaning


@cache
def glossary() -> dict[str, str]:
    """Lower-cased Spanish word or phrase -> English meaning."""
    glosses = dict(BASE_GLOSSES)
    for unit in load_units():
        for skill in unit.lesson_skills:
            for item in skill.vocab:
                words = item.es.casefold().split()
                if len(words) == 2 and words[0] in ARTICLES:
                    # "el perro" is hinted word by word: "the" + "dog".
                    glosses[words[1]] = _strip_article(item.en)
                else:
                    glosses[" ".join(words)] = item.en
    return glosses


def tokenize(sentence: str) -> list[Token]:
    """Split a Spanish sentence into hinted words and the plain text between them.

    Two adjacent words separated by one space are hinted together when they form a known phrase
    ("buenos días"); otherwise each word gets its own meaning, or none when it is not known
    (names, numbers).
    """
    glosses = glossary()
    words = list(WORD.finditer(sentence))
    tokens: list[Token] = []
    cursor = 0
    index = 0
    while index < len(words):
        match = words[index]
        if match.start() > cursor:
            tokens.append(Token(sentence[cursor : match.start()], None))
        end, hint = match.end(), glosses.get(match.group().casefold())
        if index + 1 < len(words):
            following = words[index + 1]
            phrase = sentence[match.start() : following.end()]
            if following.start() == match.end() + 1 and phrase.casefold() in glosses:
                end, hint = following.end(), glosses[phrase.casefold()]
                index += 1
        tokens.append(Token(sentence[match.start() : end], hint))
        cursor = end
        index += 1
    if cursor < len(sentence):
        tokens.append(Token(sentence[cursor:], None))
    return tokens
