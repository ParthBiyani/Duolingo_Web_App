"use client";

import { useNumberKeys } from "../keyboard";
import { ChoiceRow } from "./ChoiceRow";
import { SourceLine, SpeechBubble, audioText, characterFor, useAutoplay } from "./parts";
import type { ExerciseProps } from "./types";

/** "Select the correct meaning": a character says a sentence; pick its translation. */
export function MultipleChoice({ exercise, draft, onDraft, locked, autoplayAudio }: ExerciseProps) {
  const selected = draft !== null && "option_id" in draft ? draft.option_id : null;
  const { options } = exercise;

  useNumberKeys(options.length, !locked, (index) => onDraft({ option_id: options[index].id }));
  useAutoplay(exercise.source_lang === "es" ? audioText(exercise) : null, autoplayAudio);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {exercise.source_text ? (
        <SpeechBubble variant={characterFor(exercise)}>
          <SourceLine exercise={exercise} />
        </SpeechBubble>
      ) : null}
      <div role="group" aria-label={exercise.prompt} className="flex flex-col gap-2 md:gap-3">
        {options.map((option, index) => (
          <ChoiceRow
            key={option.id}
            index={index}
            selected={selected === option.id}
            locked={locked}
            onSelect={() => onDraft({ option_id: option.id })}
          >
            {option.text}
          </ChoiceRow>
        ))}
      </div>
    </div>
  );
}
