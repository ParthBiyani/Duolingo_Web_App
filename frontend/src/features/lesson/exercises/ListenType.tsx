"use client";

import { Speaker } from "@/components/icons";
import { speak } from "@/lib/tts";

import { lessonStrings } from "../strings";
import { TextAnswer, audioText, useAutoplay } from "./parts";
import type { ExerciseProps } from "./types";

/** "Type what you hear": the sentence plays on open; the speaker replays it. */
export function ListenType({
  exercise,
  draft,
  onDraft,
  locked,
  autoplayAudio,
  onSkipSilently,
}: ExerciseProps) {
  const text = draft !== null && "text" in draft ? draft.text : "";
  const audio = audioText(exercise);

  useAutoplay(audio, autoplayAudio);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex justify-center py-2">
        <button
          type="button"
          onClick={() => {
            if (audio) speak(audio, "es-ES");
          }}
          aria-label={lessonStrings.playAudio}
          className="grid size-[120px] cursor-pointer place-items-center rounded-panel bg-blue text-on-blue shadow-edge-blue transition-[translate,box-shadow,filter] duration-100 hover:brightness-105 active:translate-y-[4px] active:shadow-none md:size-[140px]"
        >
          <Speaker size={60} className="text-on-blue" />
        </button>
      </div>
      <TextAnswer
        value={text}
        onChange={(next) => onDraft({ text: next })}
        placeholder={lessonStrings.typeIn.es}
        lang="es"
        locked={locked}
      />
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onSkipSilently}
          disabled={locked}
          className="cursor-pointer rounded-tile px-4 py-2 text-button text-blue uppercase transition-colors hover:bg-surface-hover disabled:cursor-default disabled:opacity-50"
        >
          {lessonStrings.cantListen}
        </button>
      </div>
    </div>
  );
}
