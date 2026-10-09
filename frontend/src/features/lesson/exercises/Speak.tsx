"use client";

import { Mic } from "@/components/icons";

import { lessonStrings } from "../strings";
import { SourceLine, SpeechBubble, audioText, characterFor, useAutoplay } from "./parts";
import type { ExerciseProps } from "./types";

/**
 * "Speak this sentence": speech grading is a placeholder, so the microphone is shown as
 * coming soon and "Can't speak now" moves on without any penalty.
 */
export function Speak({ exercise, locked, autoplayAudio, onSkipSilently }: ExerciseProps) {
  useAutoplay(exercise.source_lang === "es" ? audioText(exercise) : null, autoplayAudio);

  return (
    <div className="flex flex-col gap-6 md:gap-8 short:gap-3 md:short:gap-4">
      {exercise.source_text ? (
        <SpeechBubble variant={characterFor(exercise)}>
          <SourceLine exercise={exercise} />
        </SpeechBubble>
      ) : null}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          disabled
          aria-describedby={`speak-soon-${exercise.id}`}
          className="flex h-[66px] w-full cursor-not-allowed items-center justify-center gap-3 rounded-panel border-2 border-border bg-surface text-button text-blue uppercase opacity-70 shadow-edge-border"
        >
          <Mic size={30} />
          {lessonStrings.tapToSpeak}
        </button>
        <p
          id={`speak-soon-${exercise.id}`}
          className="text-center text-button font-medium tracking-normal text-muted"
        >
          <span className="mr-2 inline-block rounded-md bg-surface-hover px-2 py-0.5 text-caps text-muted uppercase">
            {lessonStrings.comingSoon}
          </span>
          {lessonStrings.speakSoon}
        </p>
        <button
          type="button"
          onClick={onSkipSilently}
          disabled={locked}
          className="cursor-pointer rounded-tile px-4 py-2 text-button text-blue uppercase transition-colors hover:bg-surface-hover disabled:cursor-default disabled:opacity-50"
        >
          {lessonStrings.cantSpeak}
        </button>
      </div>
    </div>
  );
}
