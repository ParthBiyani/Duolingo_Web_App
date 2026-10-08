import type {
  AnswerResult,
  CompletionResult,
  Exercise,
  ExerciseType,
  SessionKind,
  SessionResponse,
} from "@/lib/api";

/** Test builders for lesson payloads (shapes follow the API contract). */

export function makeExercise(id: number, type: ExerciseType = "multiple_choice"): Exercise {
  const base: Exercise = {
    id,
    type,
    prompt: "Select the correct meaning",
    source_text: "el gato",
    source_lang: "es",
    tts_text: "el gato",
    is_new_word: false,
    options: [],
    tiles: [],
    pairs: null,
  };
  switch (type) {
    case "multiple_choice":
    case "image_choice":
    case "fill_blank":
      return {
        ...base,
        options: [
          { id: id * 10 + 1, text: "the cat", image: null },
          { id: id * 10 + 2, text: "the dog", image: null },
          { id: id * 10 + 3, text: "the bird", image: null },
        ],
      };
    case "translate_word_bank":
      return {
        ...base,
        prompt: "Write this in English",
        tiles: [
          { id: id * 10 + 1, text: "the" },
          { id: id * 10 + 2, text: "cat" },
          { id: id * 10 + 3, text: "dog" },
        ],
      };
    case "match_pairs":
      return {
        ...base,
        prompt: "Select the matching pairs",
        source_text: null,
        pairs: {
          left: [
            { id: 101, text: "hola" },
            { id: 102, text: "gato" },
          ],
          right: [
            { id: 201, text: "cat" },
            { id: 202, text: "hello" },
          ],
        },
      };
    default:
      return base;
  }
}

export function makeSession(
  exercises: Exercise[],
  overrides: Partial<SessionResponse> = {},
): SessionResponse {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    kind: "lesson",
    skill_id: 7,
    lesson_id: 21,
    lesson_position: 2,
    lessons_total: 3,
    hearts: 5,
    hearts_max: 5,
    exercises,
    rules: {
      hearts_enabled: true,
      mistakes_allowed: null,
      timer_seconds: null,
      timer_bonus_seconds: null,
    },
    started_at: "2026-10-09T05:00:00Z",
    server_now: "2026-10-09T05:00:00Z",
    ...overrides,
  };
}

export function makeSessionOfKind(kind: SessionKind, exercises: Exercise[]): SessionResponse {
  switch (kind) {
    case "legendary":
      return makeSession(exercises, {
        kind,
        rules: {
          hearts_enabled: false,
          mistakes_allowed: 3,
          timer_seconds: null,
          timer_bonus_seconds: null,
        },
      });
    case "timed":
      return makeSession(exercises, {
        kind,
        skill_id: null,
        lesson_id: null,
        rules: {
          hearts_enabled: false,
          mistakes_allowed: null,
          timer_seconds: 30,
          timer_bonus_seconds: 7,
        },
      });
    default:
      return makeSession(exercises, { kind });
  }
}

export function makeResult(overrides: Partial<AnswerResult> = {}): AnswerResult {
  return {
    outcome: "correct",
    correct: true,
    solution_display: "the cat",
    hearts: 5,
    next_heart_at: null,
    out_of_hearts: false,
    exercise_done: true,
    pair_matched: null,
    mistakes_left: null,
    ...overrides,
  };
}

export const CORRECT = makeResult();

export function wrong(hearts: number, overrides: Partial<AnswerResult> = {}): AnswerResult {
  return makeResult({
    outcome: "incorrect",
    correct: false,
    hearts,
    exercise_done: false,
    out_of_hearts: hearts === 0,
    ...overrides,
  });
}

export function makeCompletion(overrides: Partial<CompletionResult> = {}): CompletionResult {
  return {
    session_id: "00000000-0000-4000-8000-000000000000",
    kind: "lesson",
    xp: { base: 10, combo_bonus: 3, total: 13 },
    accuracy_pct: 90,
    duration_seconds: 125,
    hearts: 4,
    hearts_earned: 0,
    gems: 505,
    streak: { extended: false, previous: 12, current: 12, milestone: false, week: [] },
    daily_goal: { goal_xp: 20, today_xp: 13, reached_now: false, chest_gems: 5 },
    skill: { id: 7, lessons_completed: 2, lessons_total: 3, completed_now: false, crown_level: 0 },
    achievements: [],
    league: { tier: 1, name: "Silver", rank: 12 },
    ...overrides,
  };
}
