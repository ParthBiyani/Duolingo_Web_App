"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Check, Close } from "@/components/icons";
import { Button, toast } from "@/components/ui";

import { cx } from "./cx";
import { isCorrectOutcome, pickVariant } from "./queue";
import type { Feedback } from "./reducer";
import { lessonStrings } from "./strings";

function FeedbackLink({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => toast(lessonStrings.feedbackThanks, { id: "lesson-feedback-thanks" })}
      className="cursor-pointer rounded text-caps uppercase opacity-90 transition-opacity hover:opacity-100"
    >
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
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-4 pt-4 pb-5 md:h-[140px] md:flex-row md:items-center md:justify-between md:gap-6 md:px-10 md:py-0">
        <div role="status" className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className="hidden size-20 shrink-0 place-items-center rounded-full bg-surface md:grid"
          >
            {correct ? (
              <Check size={44} />
            ) : (
              <Close size={44} className="text-feedback-wrong-text" />
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
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {correct ? <FeedbackLink>{lessonStrings.tooEasy}</FeedbackLink> : null}
              {correct ? <FeedbackLink>{lessonStrings.tooHard}</FeedbackLink> : null}
              <FeedbackLink>{lessonStrings.report}</FeedbackLink>
            </div>
          </div>
        </div>
        <Button
          ref={continueRef}
          variant={correct ? "primary" : "danger"}
          size="lg"
          className="w-full md:w-[150px]"
          onClick={onContinue}
        >
          {lessonStrings.continue}
        </Button>
      </div>
    </div>
  );
}
