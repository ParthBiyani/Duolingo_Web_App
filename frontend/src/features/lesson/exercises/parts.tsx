"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Speaker } from "@/components/icons";
import { Character } from "@/components/mascot";
import type { Exercise } from "@/lib/api";
import { cancelSpeech, speak } from "@/lib/tts";

import { cx } from "../cx";
import { digitLabel, isTypingTarget, useWindowKeyDown } from "../keyboard";
import { lessonStrings } from "../strings";

/** Spanish text to read aloud for an exercise (dedicated TTS text first). */
export function audioText(exercise: Exercise): string | null {
  return exercise.tts_text ?? exercise.source_text;
}

/** One of the three prompt characters, chosen stably per exercise. */
export function characterFor(exercise: Exercise): 1 | 2 | 3 {
  return ((exercise.id % 3) + 1) as 1 | 2 | 3;
}

/** Reads `text` aloud shortly after the exercise appears; stops when it goes away. */
export function useAutoplay(text: string | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !text) return;
    const timer = window.setTimeout(() => speak(text, "es-ES"), 350);
    return () => {
      window.clearTimeout(timer);
      cancelSpeech();
    };
  }, [text, enabled]);
}

/** Keyboard hint (1-9, 0) shown on choices; hidden on touch-sized screens. */
export function NumberBadge({ index, selected = false }: { index: number; selected?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "hidden size-[30px] shrink-0 place-items-center rounded-lg border-2 text-button leading-none md:grid",
        selected ? "border-selected-border text-selected-text" : "border-border text-disabled",
      )}
    >
      {digitLabel(index)}
    </span>
  );
}

/** Small blue speaker that reads Spanish text aloud. */
export function SpeakerButton({ text, className }: { text: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(text, "es-ES")}
      aria-label={lessonStrings.playAudio}
      className={cx(
        "grid shrink-0 cursor-pointer place-items-center rounded-lg text-blue transition-transform duration-100 hover:brightness-110 active:scale-95",
        className,
      )}
    >
      <Speaker size={28} />
    </button>
  );
}

/** A prompt character with a speech bubble whose tail points back at them. */
export function SpeechBubble({ variant, children }: { variant: 1 | 2 | 3; children: ReactNode }) {
  return (
    <div className="flex items-end gap-1 md:gap-3">
      <Character
        variant={variant}
        size={136}
        className="h-auto w-[88px] shrink-0 md:w-[136px] short:w-[72px] md:short:w-[88px] shorter:w-[60px] md:shorter:w-[72px]"
      />
      <div className="relative mb-7 min-w-0 rounded-panel border-2 border-border bg-surface px-4 py-3 text-base leading-6 text-body md:mb-12 md:short:mb-7 shorter:mb-5 md:shorter:mb-5">
        <span
          aria-hidden="true"
          className="absolute top-1/2 -left-[9px] size-4 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-border bg-surface"
        />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

/** The bubble line for an exercise's source sentence, with audio for Spanish. */
export function SourceLine({ exercise }: { exercise: Exercise }) {
  const audio = exercise.source_lang === "es" ? audioText(exercise) : null;
  return (
    <span className="flex items-center gap-3">
      {audio ? <SpeakerButton text={audio} /> : null}
      <span lang={exercise.source_lang ?? undefined}>{exercise.source_text}</span>
    </span>
  );
}

/** The typed-answer box ("Type in English" / "Type in Spanish"). */
export function TextAnswer({
  value,
  onChange,
  placeholder,
  lang,
  locked,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  lang: "es" | "en";
  locked: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    // Typing should go straight into the answer, as on a fresh exercise.
    ref.current?.focus({ preventScroll: true });
  }, []);
  // A printable key pressed elsewhere on the page (not on a control) is typed into the answer:
  // moving focus during keydown lets the browser deliver the character to the textarea.
  useWindowKeyDown((event) => {
    const target = event.target;
    if (locked || event.key.length !== 1 || isTypingTarget(target)) return;
    if (target instanceof Element && target.closest("button, a[href], [role='button']")) return;
    ref.current?.focus({ preventScroll: true });
  });
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      readOnly={locked}
      placeholder={placeholder}
      aria-label={lessonStrings.answerLabel}
      lang={lang}
      maxLength={200}
      rows={4}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      className="min-h-[150px] w-full resize-none rounded-tile border-2 border-border bg-surface-hover px-3 py-2.5 text-lead text-body placeholder:text-disabled read-only:cursor-default focus:border-selected-border focus:outline-none short:min-h-[104px]"
    />
  );
}
