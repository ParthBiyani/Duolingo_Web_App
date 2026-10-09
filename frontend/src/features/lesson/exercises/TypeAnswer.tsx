"use client";

import { lessonStrings } from "../strings";
import {
  SourceLine,
  SpeechBubble,
  TextAnswer,
  audioText,
  characterFor,
  useAutoplay,
} from "./parts";
import type { ExerciseProps } from "./types";

/** "Write this in English/Spanish" with a keyboard: the learner types the translation. */
export function TypeAnswer({ exercise, draft, onDraft, locked, autoplayAudio }: ExerciseProps) {
  const text = draft !== null && "text" in draft ? draft.text : "";
  const target = exercise.source_lang === "es" ? "en" : "es";

  useAutoplay(exercise.source_lang === "es" ? audioText(exercise) : null, autoplayAudio);

  return (
    <div className="flex flex-col gap-6 md:gap-8 short:gap-3 md:short:gap-4">
      {exercise.source_text ? (
        <SpeechBubble variant={characterFor(exercise)}>
          <SourceLine exercise={exercise} />
        </SpeechBubble>
      ) : null}
      <TextAnswer
        value={text}
        onChange={(next) => onDraft({ text: next })}
        placeholder={lessonStrings.typeIn[target]}
        lang={target}
        locked={locked}
      />
    </div>
  );
}
