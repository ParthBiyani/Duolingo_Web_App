import type {
  Answer,
  AnswerResult,
  CompletionResult,
  Exercise,
  SessionKind,
  SessionResponse,
} from "@/lib/api";

import {
  COMBO_LABEL_FROM,
  buildQueue,
  isAnswerReady,
  isCorrectOutcome,
  progressFraction,
  requeue,
  scheduleInterstitial,
  type Interstitial,
  type QueueItem,
} from "./queue";

/**
 * Lesson player state machine (pure; side effects live in LessonPlayer).
 *
 * loading -> answering -> checking -> feedback -> [interstitial] -> answering ... -> completing
 *         -> celebrate (one step per screen) -> done
 * `failed` ends a legendary run that used up its mistakes. `modal` (quit / outOfHearts) sits on top
 * of whatever phase is underneath and blocks input while open.
 */
export type Phase =
  | "loading"
  | "answering"
  | "checking"
  | "feedback"
  | "interstitial"
  | "completing"
  | "celebrate"
  | "done"
  | "failed";

export type LessonModal = "quit" | "outOfHearts" | null;

/** Why the player finished; decides the destination and whether the session is abandoned. */
export type ExitReason = "complete" | "quit" | "no-thanks" | "practice" | "failed";

/** check = CHECK, skip = SKIP, silent-skip = "Can't listen/speak now", match = one tapped pair. */
export type SubmissionKind = "check" | "skip" | "silent-skip" | "match";

export interface PendingSubmission {
  answerId: string;
  exerciseId: number;
  answer: Answer;
  kind: SubmissionKind;
}

export interface Feedback {
  result: AnswerResult;
  kind: SubmissionKind;
  /** 0..1 roll that picks the praise headline. */
  roll: number;
}

export interface LessonError {
  code: string;
  status: number;
  message: string;
}

export interface MatchState {
  left: number | null;
  right: number | null;
  /** Tile ids (both columns) already matched. */
  matched: number[];
  /** The pair that was just rejected (red flash + shake) until the flash ends. */
  wrong: [number, number] | null;
  /** Bumped on every rejected pair so the same pair can flash twice in a row. */
  flashKey: number;
}

export type CelebrateStep =
  | { kind: "complete" }
  | { kind: "streak" }
  | { kind: "goal" }
  | { kind: "chest" }
  | { kind: "achievement"; index: number };

/** What happens once hearts are refilled from the out-of-hearts modal. */
export type RefillResume = "start" | "advance" | "stay" | null;

export interface LessonState {
  phase: Phase;
  modal: LessonModal;
  kind: SessionKind;
  session: SessionResponse | null;
  exercises: Record<number, Exercise>;
  /** queue[0] is the current item; re-asks are appended to the end. */
  queue: QueueItem[];
  /** Sequence for unique queue keys. */
  seq: number;
  /** Distinct exercises in the server plan (the progress bar's denominator). */
  totalCount: number;
  /** Distinct exercises the server reported as done. */
  doneIds: number[];
  draft: Answer | null;
  pending: PendingSubmission | null;
  feedback: Feedback | null;
  match: MatchState;
  combo: number;
  bestCombo: number;
  /** Items finished (any outcome); drives the motivation interstitial. */
  answeredCount: number;
  hearts: number;
  heartsMax: number;
  /** Bumped whenever a heart is lost so the header can pulse. */
  heartLosses: number;
  mistakesLeft: number | null;
  timeLeftMs: number | null;
  interstitial: Interstitial | null;
  reviewShown: boolean;
  motivationShown: boolean;
  /** The learner's "Motivational messages" setting. */
  motivational: boolean;
  resumeAfterRefill: RefillResume;
  completion: CompletionResult | null;
  steps: CelebrateStep[];
  stepIndex: number;
  exit: ExitReason | null;
  error: LessonError | null;
  /** Bumped by RETRY / refill so the start or complete effect runs again. */
  attempt: number;
}

export type LessonEvent =
  | { type: "LOADED"; session: SessionResponse }
  | { type: "LOAD_FAILED"; error: LessonError }
  | { type: "RETRY" }
  | { type: "SET_MOTIVATIONAL"; enabled: boolean }
  | { type: "DRAFT"; answer: Answer | null }
  | { type: "CHECK"; answerId: string }
  | { type: "SKIP"; answerId: string; silent?: boolean }
  | { type: "MATCH_SELECT"; side: "left" | "right"; tileId: number; answerId: string }
  | { type: "MATCH_FLASH_END"; flashKey: number }
  | { type: "RESULT"; answerId: string; result: AnswerResult; roll?: number }
  | { type: "MATCH_RESULT"; answerId: string; result: AnswerResult; roll?: number }
  | { type: "SUBMIT_FAILED"; answerId: string }
  | { type: "CONTINUE"; roll?: number }
  | { type: "QUIT_OPEN" }
  | { type: "QUIT_CLOSE" }
  | { type: "QUIT_CONFIRM" }
  | { type: "REFILLED"; hearts: number }
  | { type: "PRACTICE" }
  | { type: "NO_THANKS" }
  | { type: "TICK"; ms: number }
  | { type: "COMPLETED"; result: CompletionResult }
  | { type: "COMPLETE_FAILED"; error: LessonError };

const EMPTY_MATCH: MatchState = { left: null, right: null, matched: [], wrong: null, flashKey: 0 };

export function createInitialState(kind: SessionKind, motivational = true): LessonState {
  return {
    phase: "loading",
    modal: null,
    kind,
    session: null,
    exercises: {},
    queue: [],
    seq: 0,
    totalCount: 0,
    doneIds: [],
    draft: null,
    pending: null,
    feedback: null,
    match: EMPTY_MATCH,
    combo: 0,
    bestCombo: 0,
    answeredCount: 0,
    hearts: 0,
    heartsMax: 5,
    heartLosses: 0,
    mistakesLeft: null,
    timeLeftMs: null,
    interstitial: null,
    reviewShown: false,
    motivationShown: false,
    motivational,
    resumeAfterRefill: null,
    completion: null,
    steps: [],
    stepIndex: 0,
    exit: null,
    error: null,
    attempt: 0,
  };
}

// ---------------------------------------------------------------------------------------------
// Selectors

export function currentItem(state: LessonState): QueueItem | null {
  return state.queue[0] ?? null;
}

export function currentExercise(state: LessonState): Exercise | null {
  const item = currentItem(state);
  return item ? (state.exercises[item.exerciseId] ?? null) : null;
}

/** The exercise accepts input (selection, typing, tiles). */
export function isInteractive(state: LessonState): boolean {
  return state.phase === "answering" && state.modal === null && state.pending === null;
}

export function canCheck(state: LessonState): boolean {
  return isInteractive(state) && currentExercise(state) !== null && isAnswerReady(state.draft);
}

export function canSkip(state: LessonState): boolean {
  return isInteractive(state) && currentExercise(state) !== null;
}

export function lessonProgress(state: LessonState): number {
  return progressFraction(state.doneIds.length, state.totalCount);
}

/** The "N IN A ROW" count to show in the header, or null below the threshold. */
export function comboLabel(state: LessonState): number | null {
  return state.combo >= COMBO_LABEL_FROM ? state.combo : null;
}

/** A result that ends play: no hearts left, or a legendary run beyond its mistake budget. */
export function isFatal(kind: SessionKind, result: AnswerResult): boolean {
  if (result.out_of_hearts) return true;
  return kind === "legendary" && result.mistakes_left !== null && result.mistakes_left < 0;
}

export function buildCelebrateSteps(result: CompletionResult): CelebrateStep[] {
  const steps: CelebrateStep[] = [{ kind: "complete" }];
  if (result.streak.extended) steps.push({ kind: "streak" });
  if (result.daily_goal.reached_now) steps.push({ kind: "goal" }, { kind: "chest" });
  result.achievements.forEach((_, index) => steps.push({ kind: "achievement", index }));
  return steps;
}

// ---------------------------------------------------------------------------------------------
// Transitions

function addUnique(list: readonly number[], ...values: number[]): number[] {
  const next = [...list];
  for (const value of values) if (!next.includes(value)) next.push(value);
  return next;
}

/** Leaves the current item behind: completes the lesson, shows an interstitial, or moves on. */
function advance(state: LessonState, roll: number): LessonState {
  const finished = state.feedback;
  const queue = state.queue.slice(1);
  const cleared: LessonState = {
    ...state,
    queue,
    draft: null,
    pending: null,
    feedback: null,
    interstitial: null,
    match: { ...EMPTY_MATCH, flashKey: state.match.flashKey },
  };
  if (queue.length === 0) return { ...cleared, phase: "completing", error: null };

  const interstitial = scheduleInterstitial({
    enabled: state.motivational,
    next: queue[0],
    combo: state.combo,
    lastCorrect: finished !== null && isCorrectOutcome(finished.result),
    answeredCount: state.answeredCount,
    reviewShown: state.reviewShown,
    motivationShown: state.motivationShown,
    roll,
  });
  if (interstitial === null) return { ...cleared, phase: "answering" };
  return {
    ...cleared,
    phase: "interstitial",
    interstitial,
    reviewShown: state.reviewShown || interstitial.kind === "review",
    motivationShown: state.motivationShown || interstitial.kind === "motivation",
  };
}

function toFailed(state: LessonState): LessonState {
  return { ...state, phase: "failed", modal: null, pending: null };
}

/** Hearts, mistakes and the pulse counter always follow the server. */
function withVitals(state: LessonState, result: AnswerResult): LessonState {
  const lostHeart = result.hearts < state.hearts;
  return {
    ...state,
    pending: null,
    hearts: result.hearts,
    heartLosses: state.heartLosses + (lostHeart ? 1 : 0),
    mistakesLeft: result.mistakes_left ?? state.mistakesLeft,
  };
}

function timerBonusMs(state: LessonState): number {
  return (state.session?.rules.timer_bonus_seconds ?? 0) * 1000;
}

function applyAnswer(
  state: LessonState,
  pending: PendingSubmission,
  result: AnswerResult,
  roll: number,
): LessonState {
  const correct = isCorrectOutcome(result);
  const silent = pending.kind === "silent-skip";
  const combo = correct ? state.combo + 1 : silent ? state.combo : 0;

  let { queue, seq, doneIds } = state;
  if (result.exercise_done) {
    doneIds = addUnique(doneIds, pending.exerciseId);
  } else {
    seq += 1;
    queue = requeue(queue, pending.exerciseId, seq, !silent);
  }

  const timeLeftMs =
    state.timeLeftMs !== null && correct
      ? state.timeLeftMs + timerBonusMs(state)
      : state.timeLeftMs;

  const next: LessonState = {
    ...state,
    queue,
    seq,
    doneIds,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    answeredCount: state.answeredCount + 1,
    timeLeftMs,
    feedback: { result, kind: pending.kind, roll },
  };
  // "Can't listen/speak now" moves straight on without a feedback bar.
  if (silent && !isFatal(state.kind, result)) return advance(next, roll);
  return { ...next, phase: "feedback" };
}

function applyMatch(
  state: LessonState,
  pending: PendingSubmission,
  result: AnswerResult,
  roll: number,
): LessonState {
  if (!("pair" in pending.answer)) return state;
  const [left, right] = pending.answer.pair;
  const matched = result.pair_matched ?? isCorrectOutcome(result);

  if (!matched) {
    const rejected: LessonState = {
      ...state,
      combo: 0,
      match: {
        ...state.match,
        left: null,
        right: null,
        wrong: [left, right],
        flashKey: state.match.flashKey + 1,
      },
    };
    if (!isFatal(state.kind, result)) return rejected;
    if (state.kind === "legendary") return toFailed(rejected);
    return { ...rejected, modal: "outOfHearts", resumeAfterRefill: "stay" };
  }

  const board: MatchState = {
    ...state.match,
    left: null,
    right: null,
    wrong: null,
    matched: addUnique(state.match.matched, left, right),
  };
  if (!result.exercise_done) return { ...state, match: board };

  // The last pair finishes the exercise: show the green feedback bar.
  const combo = state.combo + 1;
  return {
    ...state,
    match: board,
    phase: "feedback",
    feedback: { result, kind: "match", roll },
    doneIds: addUnique(state.doneIds, pending.exerciseId),
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    answeredCount: state.answeredCount + 1,
    timeLeftMs:
      state.timeLeftMs !== null ? state.timeLeftMs + timerBonusMs(state) : state.timeLeftMs,
  };
}

function selectMatchTile(
  state: LessonState,
  side: "left" | "right",
  tileId: number,
  answerId: string,
): LessonState {
  const exercise = currentExercise(state);
  if (!isInteractive(state) || exercise?.type !== "match_pairs" || exercise.pairs === null) {
    return state;
  }
  const column = side === "left" ? exercise.pairs.left : exercise.pairs.right;
  if (!column.some((tile) => tile.id === tileId) || state.match.matched.includes(tileId)) {
    return state;
  }

  // Tapping the selected tile again deselects it.
  const toggled = state.match[side] === tileId ? null : tileId;
  const match: MatchState =
    side === "left"
      ? { ...state.match, wrong: null, left: toggled }
      : { ...state.match, wrong: null, right: toggled };
  if (match.left === null || match.right === null) return { ...state, match };

  return {
    ...state,
    match,
    pending: {
      answerId,
      exerciseId: exercise.id,
      answer: { pair: [match.left, match.right] },
      kind: "match",
    },
  };
}

/** The pending submission this result answers, or null for stale / mismatched results. */
function pendingFor(
  state: LessonState,
  answerId: string,
  match: boolean,
): PendingSubmission | null {
  const pending = state.pending;
  if (pending === null || pending.answerId !== answerId) return null;
  return (pending.kind === "match") === match ? pending : null;
}

function onContinue(state: LessonState, roll: number): LessonState {
  if (state.modal !== null) return state;
  switch (state.phase) {
    case "feedback": {
      if (state.feedback !== null && isFatal(state.kind, state.feedback.result)) {
        if (state.kind === "legendary") return toFailed(state);
        return { ...state, modal: "outOfHearts", resumeAfterRefill: "advance" };
      }
      return advance(state, roll);
    }
    case "interstitial":
      return { ...state, phase: "answering", interstitial: null };
    case "celebrate": {
      const stepIndex = state.stepIndex + 1;
      if (stepIndex >= state.steps.length) return { ...state, phase: "done", exit: "complete" };
      return { ...state, stepIndex };
    }
    case "failed":
      return { ...state, phase: "done", exit: "failed" };
    default:
      return state;
  }
}

function onRefilled(state: LessonState, hearts: number): LessonState {
  if (state.modal !== "outOfHearts") return state;
  const refilled: LessonState = { ...state, modal: null, hearts, resumeAfterRefill: null };
  switch (state.resumeAfterRefill) {
    case "start":
      return { ...refilled, error: null, attempt: state.attempt + 1 };
    case "advance":
      return advance(refilled, state.feedback?.roll ?? 0);
    default:
      return refilled;
  }
}

function exitWith(state: LessonState, exit: ExitReason): LessonState {
  return { ...state, modal: null, pending: null, phase: "done", exit };
}

const PLAYING: readonly Phase[] = ["answering", "checking", "feedback", "interstitial"];

export function lessonReducer(state: LessonState, event: LessonEvent): LessonState {
  switch (event.type) {
    case "LOADED": {
      if (state.phase !== "loading") return state;
      const { session } = event;
      const exercises: Record<number, Exercise> = {};
      for (const exercise of session.exercises) exercises[exercise.id] = exercise;
      const queue = buildQueue(session.exercises);
      return {
        ...state,
        phase: queue.length > 0 ? "answering" : "completing",
        modal: null,
        kind: session.kind,
        session,
        exercises,
        queue,
        totalCount: queue.length,
        hearts: session.hearts,
        heartsMax: session.hearts_max,
        mistakesLeft: session.rules.mistakes_allowed,
        timeLeftMs:
          session.rules.timer_seconds !== null ? session.rules.timer_seconds * 1000 : null,
        resumeAfterRefill: null,
        error: null,
      };
    }

    case "LOAD_FAILED": {
      if (state.phase !== "loading") return state;
      const noHearts = event.error.code === "no_hearts";
      return {
        ...state,
        error: event.error,
        modal: noHearts ? "outOfHearts" : null,
        resumeAfterRefill: noHearts ? "start" : null,
      };
    }

    case "RETRY":
      if ((state.phase !== "loading" && state.phase !== "completing") || state.error === null) {
        return state;
      }
      return { ...state, error: null, attempt: state.attempt + 1 };

    case "SET_MOTIVATIONAL":
      return state.motivational === event.enabled
        ? state
        : { ...state, motivational: event.enabled };

    case "DRAFT": {
      const type = currentExercise(state)?.type;
      if (
        !isInteractive(state) ||
        type === undefined ||
        type === "match_pairs" ||
        type === "speak"
      ) {
        return state;
      }
      return { ...state, draft: event.answer };
    }

    case "CHECK": {
      const exercise = currentExercise(state);
      if (!canCheck(state) || exercise === null || state.draft === null) return state;
      return {
        ...state,
        phase: "checking",
        pending: {
          answerId: event.answerId,
          exerciseId: exercise.id,
          answer: state.draft,
          kind: "check",
        },
      };
    }

    case "SKIP": {
      const exercise = currentExercise(state);
      if (!canSkip(state) || exercise === null) return state;
      return {
        ...state,
        phase: "checking",
        pending: {
          answerId: event.answerId,
          exerciseId: exercise.id,
          answer: { skipped: true },
          kind: event.silent ? "silent-skip" : "skip",
        },
      };
    }

    case "MATCH_SELECT":
      return selectMatchTile(state, event.side, event.tileId, event.answerId);

    case "MATCH_FLASH_END":
      if (state.match.wrong === null || state.match.flashKey !== event.flashKey) return state;
      return { ...state, match: { ...state.match, wrong: null } };

    case "RESULT": {
      const pending = pendingFor(state, event.answerId, false);
      if (pending === null) return state;
      return applyAnswer(withVitals(state, event.result), pending, event.result, event.roll ?? 0);
    }

    case "MATCH_RESULT": {
      const pending = pendingFor(state, event.answerId, true);
      if (pending === null) return state;
      return applyMatch(withVitals(state, event.result), pending, event.result, event.roll ?? 0);
    }

    case "SUBMIT_FAILED": {
      if (state.pending === null || state.pending.answerId !== event.answerId) return state;
      const wasMatch = state.pending.kind === "match";
      return {
        ...state,
        pending: null,
        phase: state.phase === "checking" ? "answering" : state.phase,
        match: wasMatch ? { ...state.match, left: null, right: null } : state.match,
      };
    }

    case "CONTINUE":
      return onContinue(state, event.roll ?? 0);

    case "QUIT_OPEN":
      if (state.modal !== null) return state;
      if (state.phase === "loading") return exitWith(state, "quit");
      return PLAYING.includes(state.phase) ? { ...state, modal: "quit" } : state;

    case "QUIT_CLOSE":
      return state.modal === "quit" ? { ...state, modal: null } : state;

    case "QUIT_CONFIRM":
      return state.modal === "quit" ? exitWith(state, "quit") : state;

    case "REFILLED":
      return onRefilled(state, event.hearts);

    case "PRACTICE":
      return state.modal === "outOfHearts" ? exitWith(state, "practice") : state;

    case "NO_THANKS":
      return state.modal === "outOfHearts" ? exitWith(state, "no-thanks") : state;

    case "TICK": {
      const running = state.phase === "answering" || state.phase === "checking";
      if (state.timeLeftMs === null || state.modal !== null || !running) return state;
      const timeLeftMs = Math.max(0, state.timeLeftMs - event.ms);
      if (timeLeftMs > 0) return { ...state, timeLeftMs };
      return {
        ...state,
        timeLeftMs: 0,
        phase: "completing",
        pending: null,
        draft: null,
        error: null,
      };
    }

    case "COMPLETED":
      if (state.phase !== "completing") return state;
      return {
        ...state,
        phase: "celebrate",
        completion: event.result,
        steps: buildCelebrateSteps(event.result),
        stepIndex: 0,
        error: null,
      };

    case "COMPLETE_FAILED":
      return state.phase === "completing" ? { ...state, error: event.error } : state;

    default:
      return state;
  }
}
