import type { ComponentType } from "react";

import type { ExerciseType } from "@/lib/api";

import { FillBlank } from "./FillBlank";
import { ImageChoice } from "./ImageChoice";
import { ListenType } from "./ListenType";
import { MatchPairs } from "./MatchPairs";
import { MultipleChoice } from "./MultipleChoice";
import { Speak } from "./Speak";
import { TranslateWordBank } from "./TranslateWordBank";
import { TypeAnswer } from "./TypeAnswer";
import type { ExerciseProps } from "./types";

/**
 * Exercise type -> component. Every component takes the same ExerciseProps, so adding a type
 * means one component plus one line here (and TypeScript flags a missing entry).
 */
export const exerciseRegistry: Record<ExerciseType, ComponentType<ExerciseProps>> = {
  multiple_choice: MultipleChoice,
  image_choice: ImageChoice,
  translate_word_bank: TranslateWordBank,
  match_pairs: MatchPairs,
  fill_blank: FillBlank,
  type_answer: TypeAnswer,
  listen_type: ListenType,
  speak: Speak,
};

export type { ExerciseProps } from "./types";
