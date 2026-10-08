"""Exercise generator: turns a unit's vocabulary and sentences into lessons.

Every lesson skill gets three lessons of ten exercises that follow fixed recipes, and every unit
review gets one lesson of fifteen exercises drawn from the whole unit. Distractors (wrong
options, extra tiles) come from the same unit.

The output is deterministic: each skill has its own ``random.Random`` seeded with its slug, so
the same YAML always gives the same exercises, options and order, whatever the other skills
contain. This module only builds plain data (``LessonSpec``); ``app.seed.course`` stores it.
"""

import random
import re
from collections.abc import Sequence
from dataclasses import dataclass
from enum import StrEnum

from app.domain.grading import normalize
from app.models.content import ExerciseType, Language, OptionRole
from app.seed.schema import LessonSkill, ReviewSkill, SentencePair, SkillEntry, UnitFile, VocabItem

PROMPT_PICTURE = (
    "Which one of these is \N{LEFT DOUBLE QUOTATION MARK}{word}\N{RIGHT DOUBLE QUOTATION MARK}?"
)
PROMPT_MEANING = "Select the correct meaning"
PROMPT_TO_EN = "Write this in English"
PROMPT_TO_ES = "Write this in Spanish"
PROMPT_MATCH = "Select the matching pairs"
PROMPT_FILL = "Fill in the blank"
PROMPT_LISTEN = "Type what you hear"
PROMPT_SPEAK = "Speak this sentence"

BLANK = "___"
CHOICE_COUNT = 3  # cards in a picture choice, sentences in a meaning choice
MATCH_PAIR_COUNT = 5

# A word: letters or digits, keeping "I'm" and "well-known" in one piece.
WORD = re.compile(r"[^\W_]+(?:['\N{RIGHT SINGLE QUOTATION MARK}-][^\W_]+)*")


class Step(StrEnum):
    """One slot in a lesson recipe."""

    PICTURE = "picture"  # image_choice for a word
    MATCH = "match"  # match_pairs
    MEANING = "meaning"  # multiple_choice: pick the English meaning of a Spanish sentence
    BANK_TO_EN = "bank_to_en"  # translate_word_bank from Spanish into English
    BANK_TO_ES = "bank_to_es"  # translate_word_bank from English into Spanish
    FILL = "fill"  # fill_blank
    TYPE_TO_EN = "type_to_en"  # type_answer from Spanish into English
    TYPE_TO_ES = "type_to_es"  # type_answer from English into Spanish
    LISTEN = "listen"  # listen_type
    SPEAK = "speak"  # speak (placeholder: always skipped without penalty)


S = Step
LESSON_RECIPES: tuple[tuple[Step, ...], ...] = (
    # Lesson 1 introduces three new words with pictures, then reads and builds sentences.
    (S.PICTURE, S.PICTURE, S.PICTURE, S.MATCH, S.MEANING,
     S.BANK_TO_EN, S.MEANING, S.FILL, S.BANK_TO_EN, S.TYPE_TO_EN),
    # Lesson 2 starts producing Spanish.
    (S.PICTURE, S.MATCH, S.BANK_TO_ES, S.FILL, S.MEANING,
     S.TYPE_TO_EN, S.LISTEN, S.BANK_TO_ES, S.FILL, S.TYPE_TO_ES),
    # Lesson 3 is mostly recall: typing, listening and speaking.
    (S.BANK_TO_EN, S.LISTEN, S.TYPE_TO_ES, S.MATCH, S.BANK_TO_ES,
     S.FILL, S.SPEAK, S.BANK_TO_EN, S.LISTEN, S.TYPE_TO_EN),
)  # fmt: skip
REVIEW_RECIPE: tuple[Step, ...] = (
    S.PICTURE, S.MEANING, S.BANK_TO_EN, S.MATCH, S.FILL, S.TYPE_TO_EN, S.LISTEN, S.BANK_TO_ES,
    S.PICTURE, S.MEANING, S.FILL, S.TYPE_TO_ES, S.BANK_TO_EN, S.LISTEN, S.BANK_TO_ES,
)  # fmt: skip


@dataclass(frozen=True)
class OptionSpec:
    role: OptionRole
    position: int
    text: str
    image_key: str | None = None
    is_correct: bool = False
    pair_key: int | None = None
    answer_position: int | None = None


@dataclass(frozen=True)
class ExerciseSpec:
    type: ExerciseType
    prompt: str
    source_text: str | None = None
    source_lang: Language | None = None
    tts_text: str | None = None
    is_new_word: bool = False
    options: tuple[OptionSpec, ...] = ()
    answers: tuple[str, ...] = ()  # accepted answers, canonical first


@dataclass(frozen=True)
class LessonSpec:
    position: int
    exercises: tuple[ExerciseSpec, ...]


def lessons_for(skill: SkillEntry, unit: UnitFile) -> list[LessonSpec]:
    """Return the lessons of one path node: three for a lesson skill, one for a unit review."""
    if isinstance(skill, LessonSkill):
        builder = _ExerciseBuilder(skill.slug, skill.vocab, skill.sentences, unit)
        return [
            LessonSpec(
                position, tuple(builder.build(step, new_word=position == 1) for step in recipe)
            )
            for position, recipe in enumerate(LESSON_RECIPES, start=1)
        ]
    if isinstance(skill, ReviewSkill):
        vocab = [item for lesson_skill in unit.lesson_skills for item in lesson_skill.vocab]
        sentences = [pair for lesson_skill in unit.lesson_skills for pair in lesson_skill.sentences]
        builder = _ExerciseBuilder(skill.slug, vocab, sentences, unit)
        return [LessonSpec(1, tuple(builder.build(step, new_word=False) for step in REVIEW_RECIPE))]
    return []  # a chest has no lessons


class Deck[T]:
    """Deals items in random order and reshuffles once every item has been dealt."""

    def __init__(self, items: Sequence[T], rng: random.Random) -> None:
        self._items = list(items)
        self._rng = rng
        self._pile: list[T] = []

    def draw(self) -> T:
        if not self._pile:
            self._pile = self._items.copy()
            self._rng.shuffle(self._pile)
        return self._pile.pop()


class _ExerciseBuilder:
    """Builds the exercises of one path node from its words and sentences."""

    def __init__(
        self,
        seed: str,
        vocab: Sequence[VocabItem],
        sentences: Sequence[SentencePair],
        unit: UnitFile,
    ) -> None:
        self.rng = random.Random(seed)
        self.vocab = list(vocab)
        self.sentences = Deck(sentences, self.rng)
        self.introduced: set[str] = set()  # words already used for a picture or word choice
        self.unit_vocab = [item for skill in unit.lesson_skills for item in skill.vocab]
        self.unit_sentences = [pair for skill in unit.lesson_skills for pair in skill.sentences]
        self.words = {"en": _unit_words(unit, "en"), "es": _unit_words(unit, "es")}

    def build(self, step: Step, *, new_word: bool) -> ExerciseSpec:
        match step:
            case Step.PICTURE:
                return self.picture(new_word)
            case Step.MATCH:
                return self.match_pairs()
            case Step.MEANING:
                return self.meaning(self.sentences.draw())
            case Step.BANK_TO_EN:
                return self.word_bank(self.sentences.draw(), "en")
            case Step.BANK_TO_ES:
                return self.word_bank(self.sentences.draw(), "es")
            case Step.FILL:
                return self.fill_blank(self.sentences.draw())
            case Step.TYPE_TO_EN:
                return self.type_answer(self.sentences.draw(), "en")
            case Step.TYPE_TO_ES:
                return self.type_answer(self.sentences.draw(), "es")
            case Step.LISTEN:
                return self.listen(self.sentences.draw())
            case Step.SPEAK:
                return self.speak(self.sentences.draw())

    def picture(self, new_word: bool) -> ExerciseSpec:
        """Pick the picture of a word; a word without a picture becomes a word choice instead."""
        pictured = [item for item in self.vocab if item.emoji]
        if pictured:
            # Prefer a word that has not been introduced yet in this skill.
            fresh = [item for item in pictured if item.es not in self.introduced]
            target = self.rng.choice(fresh or pictured)
            others = [
                item
                for item in self.unit_vocab
                if item.emoji
                and item.emoji != target.emoji
                and item.en.casefold() != target.en.casefold()
            ]
            if len(others) >= CHOICE_COUNT - 1:
                self.introduced.add(target.es)
                cards = [target, *self.rng.sample(others, CHOICE_COUNT - 1)]
                self.rng.shuffle(cards)
                options = tuple(
                    OptionSpec(
                        "choice", position, card.es, image_key=card.emoji, is_correct=card == target
                    )
                    for position, card in enumerate(cards)
                )
                return ExerciseSpec(
                    "image_choice",
                    PROMPT_PICTURE.format(word=target.en),
                    is_new_word=new_word,
                    options=options,
                    answers=(target.es,),
                )
        return self.word_choice(new_word)

    def word_choice(self, new_word: bool) -> ExerciseSpec:
        """Pick the English meaning of a single word (for words that have no picture)."""
        target = self.rng.choice(
            [item for item in self.vocab if item.es not in self.introduced] or self.vocab
        )
        self.introduced.add(target.es)
        meanings = sorted(
            {item.en for item in self.unit_vocab if item.en.casefold() != target.en.casefold()}
        )
        return self._choice(source=target.es, correct=target.en, wrong=meanings, new_word=new_word)

    def meaning(self, pair: SentencePair) -> ExerciseSpec:
        accepted = {normalize(text) for text in (pair.en, *pair.alt_en)}
        wrong = sorted({p.en for p in self.unit_sentences if normalize(p.en) not in accepted})
        return self._choice(source=pair.es, correct=pair.en, wrong=wrong, new_word=False)

    def _choice(
        self, *, source: str, correct: str, wrong: Sequence[str], new_word: bool
    ) -> ExerciseSpec:
        texts = [correct, *self.rng.sample(wrong, min(len(wrong), CHOICE_COUNT - 1))]
        self.rng.shuffle(texts)
        options = tuple(
            OptionSpec("choice", position, text, is_correct=text == correct)
            for position, text in enumerate(texts)
        )
        return ExerciseSpec(
            "multiple_choice",
            PROMPT_MEANING,
            source_text=source,
            source_lang="es",
            tts_text=source,
            is_new_word=new_word,
            options=options,
            answers=(correct,),
        )

    def word_bank(self, pair: SentencePair, target: Language) -> ExerciseSpec:
        """Build the translation from tiles: the answer's words plus 2-3 unit words."""
        source, answer, alternatives = _direction(pair, target)
        accepted = _unique(answer, *alternatives)
        in_answers = {word.casefold() for text in accepted for word in WORD.findall(text)}
        spare = [word for word in self.words[target] if word.casefold() not in in_answers]
        extra = self.rng.sample(spare, min(len(spare), self.rng.choice((2, 3))))
        # Each tile is (text, place in the answer); the extra tiles have no place.
        tiles: list[tuple[str, int | None]] = [
            (word, index) for index, word in enumerate(WORD.findall(answer))
        ]
        tiles += [(word, None) for word in extra]
        self.rng.shuffle(tiles)
        options = tuple(
            OptionSpec("tile", position, word, is_correct=index is not None, answer_position=index)
            for position, (word, index) in enumerate(tiles)
        )
        return ExerciseSpec(
            "translate_word_bank",
            PROMPT_TO_EN if target == "en" else PROMPT_TO_ES,
            source_text=source,
            source_lang="es" if target == "en" else "en",
            tts_text=pair.es if target == "en" else None,
            options=options,
            answers=accepted,
        )

    def fill_blank(self, pair: SentencePair) -> ExerciseSpec:
        """Blank out one word of a Spanish sentence and offer 3-4 words to fill it."""
        words = list(WORD.finditer(pair.es))
        # Skip the first word: its capital letter would give the answer away.
        candidates = words[1:] or words
        taught = {item.es.casefold() for item in self.unit_vocab}
        known = [match for match in candidates if match.group().casefold() in taught]
        blank = self.rng.choice(known) if known else max(candidates, key=lambda m: len(m.group()))
        answer = blank.group()
        gapped = pair.es[: blank.start()] + BLANK + pair.es[blank.end() :]
        accepted = {normalize(text) for text in (pair.es, *pair.alt_es)}
        spare = [
            word
            for word in self.words["es"]
            if word.casefold() != answer.casefold()
            and normalize(gapped.replace(BLANK, word)) not in accepted
        ]
        choices = [answer, *self.rng.sample(spare, min(len(spare), self.rng.choice((2, 3))))]
        self.rng.shuffle(choices)
        options = tuple(
            OptionSpec("choice", position, word, is_correct=word == answer)
            for position, word in enumerate(choices)
        )
        return ExerciseSpec(
            "fill_blank",
            PROMPT_FILL,
            source_text=gapped,
            source_lang="es",
            options=options,
            answers=(pair.es,),  # shown as the solution
        )

    def type_answer(self, pair: SentencePair, target: Language) -> ExerciseSpec:
        source, answer, alternatives = _direction(pair, target)
        return ExerciseSpec(
            "type_answer",
            PROMPT_TO_EN if target == "en" else PROMPT_TO_ES,
            source_text=source,
            source_lang="es" if target == "en" else "en",
            tts_text=pair.es if target == "en" else None,
            answers=_unique(answer, *alternatives),
        )

    def listen(self, pair: SentencePair) -> ExerciseSpec:
        # Only the sentence that was read aloud counts; a different wording is not dictation.
        return ExerciseSpec("listen_type", PROMPT_LISTEN, tts_text=pair.es, answers=(pair.es,))

    def speak(self, pair: SentencePair) -> ExerciseSpec:
        return ExerciseSpec(
            "speak",
            PROMPT_SPEAK,
            source_text=pair.es,
            source_lang="es",
            tts_text=pair.es,
            answers=(pair.es,),
        )

    def match_pairs(self) -> ExerciseSpec:
        """Five Spanish words to match with their English meanings, each column shuffled."""
        chosen: list[VocabItem] = []
        for item in self.rng.sample(self.vocab, len(self.vocab)):
            if any(
                item.es.casefold() == other.es.casefold()
                or item.en.casefold() == other.en.casefold()
                for other in chosen
            ):
                continue  # two identical cards in one column would make the pairs ambiguous
            chosen.append(item)
            if len(chosen) == MATCH_PAIR_COUNT:
                break
        left = self.rng.sample(range(len(chosen)), len(chosen))
        right = self.rng.sample(range(len(chosen)), len(chosen))
        options = tuple(
            OptionSpec("pair_left", position, chosen[index].es, pair_key=index + 1)
            for position, index in enumerate(left)
        ) + tuple(
            OptionSpec("pair_right", position, chosen[index].en, pair_key=index + 1)
            for position, index in enumerate(right)
        )
        return ExerciseSpec("match_pairs", PROMPT_MATCH, options=options)


def _direction(pair: SentencePair, target: Language) -> tuple[str, str, tuple[str, ...]]:
    """Return (source text, canonical answer, other accepted answers) for a translation."""
    if target == "en":
        return pair.es, pair.en, pair.alt_en
    return pair.en, pair.es, pair.alt_es


def _unique(*texts: str) -> tuple[str, ...]:
    """Drop repeated answers, keeping the first (canonical) one first."""
    return tuple(dict.fromkeys(texts))


def _unit_words(unit: UnitFile, language: Language) -> list[str]:
    """Single words of one language used in the unit, the pool for distractors.

    Vocabulary entries of one word, plus sentence words after the first that start lowercase,
    so neither a sentence's capitalised first word nor a name ends up as a stray tile.
    """
    words: dict[str, str] = {}
    for skill in unit.lesson_skills:
        for item in skill.vocab:
            tokens = WORD.findall(item.en if language == "en" else item.es)
            if len(tokens) == 1:
                words.setdefault(tokens[0].casefold(), tokens[0])
        for pair in skill.sentences:
            for token in WORD.findall(pair.en if language == "en" else pair.es)[1:]:
                if token[0].islower():
                    words.setdefault(token.casefold(), token)
    return [words[key] for key in sorted(words)]
