"use client";

import { Button } from "@/components/ui";

import { FeedbackBar } from "./FeedbackBar";
import type { Feedback } from "./reducer";
import { lessonStrings } from "./strings";

/**
 * answer   SKIP + CHECK (CHECK is flat grey until there is an answer, busy while grading)
 * continue a single CONTINUE (interstitials, failed runs, retrying a save)
 * busy     CONTINUE with a spinner (saving the lesson)
 * feedback the result panel that replaces the footer after CHECK
 */
export type FooterMode = "answer" | "continue" | "busy" | "feedback";

interface LessonFooterProps {
  mode: FooterMode;
  checking: boolean;
  canCheck: boolean;
  canSkip: boolean;
  feedback: Feedback | null;
  continueLabel?: string;
  onCheck: () => void;
  onSkip: () => void;
  onContinue: () => void;
}

/** The 140px lesson footer (fixed to the bottom of the screen on phones). */
export function LessonFooter({
  mode,
  checking,
  canCheck,
  canSkip,
  feedback,
  continueLabel = lessonStrings.continue,
  onCheck,
  onSkip,
  onContinue,
}: LessonFooterProps) {
  if (mode === "feedback" && feedback !== null) {
    return (
      <footer className="shrink-0 overflow-hidden">
        <FeedbackBar feedback={feedback} onContinue={onContinue} />
      </footer>
    );
  }

  return (
    <footer className="shrink-0 border-t-2 border-border">
      <div className="mx-auto flex w-full max-w-[1000px] items-center justify-between gap-4 px-4 py-4 md:h-[140px] md:px-10 md:py-0 short:py-3 md:short:h-[100px]">
        {mode === "answer" ? (
          <>
            <Button
              variant="outline"
              size="lg"
              className="hidden text-disabled md:inline-flex md:w-[150px]"
              disabled={!canSkip}
              onClick={onSkip}
            >
              {lessonStrings.skip}
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="w-full md:w-[150px]"
              disabled={!canCheck && !checking}
              loading={checking}
              onClick={onCheck}
            >
              {lessonStrings.check}
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full md:ml-auto md:w-[150px]"
            loading={mode === "busy"}
            onClick={onContinue}
          >
            {continueLabel}
          </Button>
        )}
      </div>
    </footer>
  );
}
