import type { Answer, AnswerResult, Exercise } from "@/lib/api";

import type { MatchState } from "../reducer";

/** Props every exercise component receives from the player (see registry.ts). */
export interface ExerciseProps {
  exercise: Exercise;
  /** The learner's current answer, or null when nothing is chosen yet. */
  draft: Answer | null;
  onDraft: (answer: Answer | null) => void;
  /** True while checking, during feedback and while a modal is open: no input. */
  locked: boolean;
  /** The graded result once the feedback bar is showing. */
  result: AnswerResult | null;
  /** Match pairs board (selection, matched tiles, the rejected pair). */
  match: MatchState;
  onMatchSelect: (side: "left" | "right", tileId: number) => void;
  onMatchFlashEnd: (flashKey: number) => void;
  /** "Can't listen now" / "Can't speak now": move on without losing a heart. */
  onSkipSilently: () => void;
  /** Play Spanish audio automatically when an exercise opens (Listening exercises setting). */
  autoplayAudio: boolean;
}
