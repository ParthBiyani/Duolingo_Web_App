"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

import { Close } from "@/components/icons";
import { Button, toast } from "@/components/ui";

import { cx } from "./cx";
import { isCorrectOutcome, pickVariant } from "./queue";
import type { Feedback } from "./reducer";
import { lessonStrings } from "./strings";

/** Footer buttons use a 17px label (the shared buttons use 15px). */
export const FOOTER_LABEL = "text-base leading-[1.2]";

/** Double chevron pointing up (harder) or down (easier), drawn for the rating links. */
function ChevronsGlyph({ up }: { up: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={
          up
            ? "M3.5 8 8 3.5 12.5 8M3.5 12.5 8 8l4.5 4.5"
            : "M3.5 3.5 8 8l4.5-4.5M3.5 8 8 12.5 12.5 8"
        }
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A small flag, drawn for the REPORT link. */
function FlagGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 14.5V2.5M3.5 2.5h8.2l-1.9 3.2 1.9 3.2H3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeedbackLink({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => toast(lessonStrings.feedbackThanks, { id: "lesson-feedback-thanks" })}
      className="flex cursor-pointer items-center gap-2 rounded text-button uppercase opacity-90 transition-opacity hover:opacity-100"
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * The result panel that slides up over the footer after CHECK: green with praise (and a
 * spelling note for typos), or red with the correct solution. CONTINUE takes focus so Enter
 * moves on.
 */
export function FeedbackBar({
  feedback,
  onContinue,
}: {
  feedback: Feedback;
  onContinue: () => void;
}) {
  const { result, roll } = feedback;
  const correct = isCorrectOutcome(result);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    continueRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      className={cx(
        "animate-slide-up",
        correct
          ? "bg-feedback-correct-bg text-feedback-correct-text"
          : "bg-feedback-wrong-bg text-feedback-wrong-text",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-4 pt-4 pb-5 md:h-[140px] md:flex-row md:items-center md:justify-between md:gap-6 md:px-10 md:py-0 short:pt-3 short:pb-3 md:short:h-[112px] shorter:gap-2">
        <div role="status" className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className="hidden size-20 shrink-0 place-items-center rounded-full bg-surface md:grid md:short:size-16"
          >
            {correct ? (
              <Image src="/duo/lesson/check.svg" alt="" width={41} height={31} />
            ) : (
              <Close size={40} className="text-feedback-wrong-text" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-heading">
              {correct
                ? pickVariant(lessonStrings.praise, roll)
                : result.solution_display
                  ? lessonStrings.correctSolution
                  : lessonStrings.comeBackLater}
            </h2>
            {correct && result.outcome === "typo" && result.solution_display ? (
              <p className="mt-1 text-base">
                {lessonStrings.typoNote}{" "}
                <span className="font-bold">{result.solution_display}</span>
              </p>
            ) : null}
            {!correct && result.solution_display ? (
              <p className="mt-1 text-base">{result.solution_display}</p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1">
              {correct ? (
                <FeedbackLink icon={<ChevronsGlyph up />}>{lessonStrings.tooEasy}</FeedbackLink>
              ) : null}
              {correct ? (
                <FeedbackLink icon={<ChevronsGlyph up={false} />}>
                  {lessonStrings.tooHard}
                </FeedbackLink>
              ) : null}
              <FeedbackLink icon={<FlagGlyph />}>{lessonStrings.report}</FeedbackLink>
            </div>
          </div>
        </div>
        <Button
          ref={continueRef}
          variant={correct ? "primary" : "danger"}
          size="lg"
          className={cx(FOOTER_LABEL, "w-full md:w-[150px]")}
          onClick={onContinue}
        >
          {lessonStrings.continue}
        </Button>
      </div>
    </div>
  );
}
