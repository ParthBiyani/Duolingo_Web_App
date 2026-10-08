"use client";

import { cx } from "../cx";
import { useNumberKeys } from "../keyboard";
import { lessonStrings } from "../strings";
import { ChoiceRow } from "./ChoiceRow";
import { SpeechBubble, characterFor } from "./parts";
import type { ExerciseProps } from "./types";

const GAP = "___";
/** Keeps the empty gap one line tall. */
const NBSP = "\u00a0";

/** "Fill in the blank": the chosen option drops into the gap in the sentence. */
export function FillBlank({ exercise, draft, onDraft, locked }: ExerciseProps) {
  const selected = draft !== null && "option_id" in draft ? draft.option_id : null;
  const { options } = exercise;
  const chosen = options.find((option) => option.id === selected) ?? null;

  const sentence = exercise.source_text ?? GAP;
  const gapAt = sentence.indexOf(GAP);
  const before = gapAt >= 0 ? sentence.slice(0, gapAt) : sentence;
  const after = gapAt >= 0 ? sentence.slice(gapAt + GAP.length) : "";

  useNumberKeys(options.length, !locked, (index) => onDraft({ option_id: options[index].id }));

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <SpeechBubble variant={characterFor(exercise)}>
        <p lang={exercise.source_lang ?? undefined} className="leading-8">
          {before}
          <span
            className={cx(
              "mx-1 inline-block min-w-[72px] border-b-2 px-1 text-center align-baseline leading-6",
              chosen ? "border-selected-border font-bold text-selected-text" : "border-current",
            )}
          >
            {chosen ? chosen.text : NBSP}
            {chosen ? null : <span className="sr-only">{lessonStrings.blank}</span>}
          </span>
          {after}
        </p>
      </SpeechBubble>
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
