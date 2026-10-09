"use client";

import type { ReactNode } from "react";

import type { Option } from "@/lib/api";

import { cx } from "../cx";
import { useNumberKeys } from "../keyboard";
import { lessonStrings } from "../strings";
import { ChoiceRow } from "./ChoiceRow";
import { SpeechBubble, characterFor, choiceTone, type ChoiceTone } from "./parts";
import type { ExerciseProps } from "./types";
import { HintedTokens, sourceTokens } from "./WordHints";

const GAP = "___";
/** Keeps the empty gap one line tall. */
const NBSP = " ";

const GAP_TONE_CLASSES: Record<ChoiceTone, string> = {
  idle: "border-current",
  selected: "border-selected-border font-bold text-selected-text",
  correct: "border-feedback-correct-text font-bold text-feedback-correct-text",
  wrong: "border-feedback-wrong-text font-bold text-feedback-wrong-text",
};

/** The underlined gap, showing the chosen option once there is one. */
function Gap({ chosen, tone }: { chosen: Option | null; tone: ChoiceTone }) {
  return (
    <span
      className={cx(
        "mx-1 inline-block min-w-[72px] border-b-2 px-1 text-center align-baseline leading-6",
        GAP_TONE_CLASSES[tone],
      )}
    >
      {chosen ? chosen.text : NBSP}
      {chosen ? null : <span className="sr-only">{lessonStrings.blank}</span>}
    </span>
  );
}

/** Splits `text` around the gap marker and drops `gap` into its place. */
function withGap(text: string, gap: ReactNode): ReactNode {
  const at = text.indexOf(GAP);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      {gap}
      {text.slice(at + GAP.length)}
    </>
  );
}

/** "Fill in the blank": the chosen option drops into the gap in the sentence. */
export function FillBlank({ exercise, draft, onDraft, locked, result }: ExerciseProps) {
  const selected = draft !== null && "option_id" in draft ? draft.option_id : null;
  const { options } = exercise;
  const chosen = options.find((option) => option.id === selected) ?? null;
  const gap = <Gap chosen={chosen} tone={choiceTone(chosen !== null, result)} />;
  const tokens = sourceTokens(exercise);

  useNumberKeys(options.length, !locked, (index) => onDraft({ option_id: options[index].id }));

  return (
    <div className="flex flex-col gap-6 md:gap-8 short:gap-3 md:short:gap-4">
      <SpeechBubble variant={characterFor(exercise)}>
        <p lang={exercise.source_lang ?? undefined} className="leading-8">
          {tokens ? (
            <HintedTokens tokens={tokens} renderText={(text) => withGap(text, gap)} />
          ) : (
            withGap(exercise.source_text ?? GAP, gap)
          )}
        </p>
      </SpeechBubble>
      <div
        role="group"
        aria-label={exercise.prompt}
        className="flex flex-col gap-2 md:gap-3 md:shorter:gap-2"
      >
        {options.map((option, index) => (
          <ChoiceRow
            key={option.id}
            index={index}
            tone={choiceTone(selected === option.id, result)}
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
