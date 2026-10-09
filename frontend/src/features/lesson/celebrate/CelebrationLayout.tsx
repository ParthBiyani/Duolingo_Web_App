"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui";

import { lessonStrings } from "../strings";

interface CelebrationLayoutProps {
  children: ReactNode;
  onContinue: () => void;
  /** Optional left-hand footer action (REVIEW LESSON on the lesson-complete screen). */
  secondary?: ReactNode;
}

/** Full-screen celebration step: centred content above the standard 140px footer. */
export function CelebrationLayout({ children, onContinue, secondary }: CelebrationLayoutProps) {
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    continueRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[600px] flex-1 animate-fade-in flex-col items-center justify-center gap-5 px-4 py-8 text-center md:gap-6">
          {children}
        </div>
      </main>
      <footer className="shrink-0 border-t-2 border-border">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-3 px-4 py-4 md:h-[140px] md:flex-row md:items-center md:justify-between md:px-10 md:py-0">
          {secondary}
          <Button
            ref={continueRef}
            variant="primary"
            size="lg"
            className="w-full md:ml-auto md:w-[150px]"
            onClick={onContinue}
          >
            {lessonStrings.continue}
          </Button>
        </div>
      </footer>
    </div>
  );
}
