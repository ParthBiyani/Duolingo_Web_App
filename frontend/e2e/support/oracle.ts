/**
 * The answer oracle. The API never sends answers to the browser, so the tests read them from the
 * suite's own SQLite file (read-only). Course content never changes while the suite runs (a demo
 * reset only recreates learners), so the whole answer key is loaded once per worker.
 */
import { DatabaseSync } from "node:sqlite";

export type ExerciseType =
  | "multiple_choice"
  | "image_choice"
  | "translate_word_bank"
  | "match_pairs"
  | "fill_blank"
  | "type_answer"
  | "listen_type"
  | "speak";

/** A choice, tile or match card as the learner sees it. */
export interface Card {
  id: number;
  text: string;
}

export interface Pair {
  left: Card;
  right: Card;
}

/** The correct answer to one exercise, in the terms the UI uses. */
export type CorrectAnswer =
  | { kind: "option"; option: Card } // multiple_choice, image_choice, fill_blank
  | { kind: "tiles"; tiles: Card[] } // translate_word_bank, in answer order
  | { kind: "text"; text: string } // type_answer, listen_type (the canonical answer)
  | { kind: "pairs"; pairs: Pair[] } // match_pairs
  | { kind: "speak" }; // speak: a placeholder that is always skipped

/** An answer the server grades as incorrect (it costs a heart in a lesson). */
export type WrongAnswer =
  | { kind: "option"; option: Card }
  | { kind: "tiles"; tiles: Card[] }
  | { kind: "text"; text: string }
  | { kind: "pair"; pair: Pair };

/** Request bodies for POST /sessions/{id}/answers; match pairs take one request per pair. */
export type ApiAnswer =
  | { option_id: number }
  | { tile_ids: number[] }
  | { text: string }
  | { pair: [number, number] }
  | { skipped: true };

interface OptionRow {
  id: number;
  exercise_id: number;
  role: "choice" | "tile" | "pair_left" | "pair_right";
  text: string;
  is_correct: number;
  pair_key: number | null;
  answer_position: number | null;
}

interface AnswerRow {
  exercise_id: number;
  text: string;
}

interface ExerciseKey {
  type: ExerciseType;
  options: OptionRow[];
  /** Accepted typed answers, canonical first. */
  answers: string[];
}

let answerKey: Map<number, ExerciseKey> | null = null;

function databasePath(): string {
  const file = process.env.E2E_DB_PATH;
  if (!file) throw new Error("E2E_DB_PATH is not set; run the suite through playwright.config.ts");
  return file;
}

function load(): Map<number, ExerciseKey> {
  const db = new DatabaseSync(databasePath(), { readOnly: true });
  try {
    const key = new Map<number, ExerciseKey>();
    const exercises = db.prepare("SELECT id, type FROM exercises").all() as unknown as {
      id: number;
      type: ExerciseType;
    }[];
    for (const { id, type } of exercises) key.set(id, { type, options: [], answers: [] });

    const options = db
      .prepare(
        `SELECT id, exercise_id, role, text, is_correct, pair_key, answer_position
         FROM exercise_options ORDER BY exercise_id, role, position`,
      )
      .all() as unknown as OptionRow[];
    for (const option of options) key.get(option.exercise_id)?.options.push(option);

    const answers = db
      .prepare(
        `SELECT exercise_id, text FROM exercise_answers
         ORDER BY exercise_id, is_canonical DESC, id`,
      )
      .all() as unknown as AnswerRow[];
    for (const answer of answers) key.get(answer.exercise_id)?.answers.push(answer.text);
    return key;
  } finally {
    db.close();
  }
}

function keyFor(exerciseId: number): ExerciseKey {
  answerKey ??= load();
  const key = answerKey.get(exerciseId);
  if (!key) throw new Error(`exercise ${exerciseId} is not in ${databasePath()}`);
  return key;
}

/** The type of an exercise (the UI only shows its prompt). */
export function exerciseType(exerciseId: number): ExerciseType {
  return keyFor(exerciseId).type;
}

const card = (option: OptionRow): Card => ({ id: option.id, text: option.text });

function pairsOf(key: ExerciseKey): Pair[] {
  const left = key.options.filter((option) => option.role === "pair_left");
  const right = key.options.filter((option) => option.role === "pair_right");
  return left.map((leftCard) => {
    const match = right.find((rightCard) => rightCard.pair_key === leftCard.pair_key);
    if (!match) throw new Error(`match card ${leftCard.id} has no partner`);
    return { left: card(leftCard), right: card(match) };
  });
}

export function correctAnswer(exerciseId: number): CorrectAnswer {
  const key = keyFor(exerciseId);
  switch (key.type) {
    case "multiple_choice":
    case "image_choice":
    case "fill_blank": {
      const option = key.options.find((row) => row.role === "choice" && row.is_correct === 1);
      if (!option) throw new Error(`exercise ${exerciseId} has no correct option`);
      return { kind: "option", option: card(option) };
    }
    case "translate_word_bank": {
      const tiles = key.options
        .filter((row) => row.role === "tile" && row.answer_position !== null)
        .sort((a, b) => (a.answer_position ?? 0) - (b.answer_position ?? 0));
      return { kind: "tiles", tiles: tiles.map(card) };
    }
    case "type_answer":
    case "listen_type": {
      const [canonical] = key.answers;
      if (canonical === undefined) throw new Error(`exercise ${exerciseId} has no answer`);
      return { kind: "text", text: canonical };
    }
    case "match_pairs":
      return { kind: "pairs", pairs: pairsOf(key) };
    case "speak":
      return { kind: "speak" };
  }
}

/** An incorrect answer, or null for `speak`, which cannot be answered wrongly. */
export function wrongAnswer(exerciseId: number): WrongAnswer | null {
  const key = keyFor(exerciseId);
  switch (key.type) {
    case "multiple_choice":
    case "image_choice":
    case "fill_blank": {
      const option = key.options.find((row) => row.role === "choice" && row.is_correct === 0);
      if (!option) throw new Error(`exercise ${exerciseId} has no wrong option`);
      return { kind: "option", option: card(option) };
    }
    case "translate_word_bank": {
      // A single spare tile never reads as the sentence.
      const spare = key.options.find((row) => row.role === "tile" && row.answer_position === null);
      const tiles = spare ? [spare] : key.options.filter((row) => row.role === "tile").reverse();
      return { kind: "tiles", tiles: tiles.map(card) };
    }
    case "type_answer":
    case "listen_type":
      return { kind: "text", text: "zzzz qqqq xxxx" };
    case "match_pairs": {
      const [first, second] = pairsOf(key);
      return { kind: "pair", pair: { left: first.left, right: second.right } };
    }
    case "speak":
      return null;
  }
}

/** An API answer the server grades as incorrect, or null for `speak`. */
export function wrongApiAnswer(exerciseId: number): ApiAnswer | null {
  const answer = wrongAnswer(exerciseId);
  if (answer === null) return null;
  switch (answer.kind) {
    case "option":
      return { option_id: answer.option.id };
    case "tiles":
      return { tile_ids: answer.tiles.map((tile) => tile.id) };
    case "text":
      return { text: answer.text };
    case "pair":
      return { pair: [answer.pair.left.id, answer.pair.right.id] };
  }
}

/** The API requests that answer an exercise correctly (one per pair for match exercises). */
export function apiAnswers(exerciseId: number): ApiAnswer[] {
  const answer = correctAnswer(exerciseId);
  switch (answer.kind) {
    case "option":
      return [{ option_id: answer.option.id }];
    case "tiles":
      return [{ tile_ids: answer.tiles.map((tile) => tile.id) }];
    case "text":
      return [{ text: answer.text }];
    case "pairs":
      return answer.pairs.map(({ left, right }) => ({ pair: [left.id, right.id] }));
    case "speak":
      return [{ skipped: true }];
  }
}
