"use client";

import { Button, toast } from "@/components/ui";
import type { CompletionResult, SessionKind } from "@/lib/api";

import type { CelebrateStep } from "../reducer";
import { lessonStrings } from "../strings";
import { AchievementUnlocked } from "./AchievementUnlocked";
import { CelebrationLayout } from "./CelebrationLayout";
import { ChestReward, GoalReached } from "./GoalChest";
import { LessonComplete } from "./LessonComplete";
import { StreakExtended } from "./StreakExtended";

interface CelebrationProps {
  result: CompletionResult;
  kind: SessionKind;
  step: CelebrateStep;
  /** Index of the step, so each screen mounts (and animates) fresh. */
  stepIndex: number;
  animations: boolean;
  onContinue: () => void;
}

function StepContent({
  result,
  kind,
  step,
  animations,
}: Omit<CelebrationProps, "stepIndex" | "onContinue">) {
  switch (step.kind) {
    case "complete":
      return <LessonComplete result={result} kind={kind} animations={animations} />;
    case "streak":
      return <StreakExtended streak={result.streak} />;
    case "goal":
      return <GoalReached goal={result.daily_goal} />;
    case "chest":
      return <ChestReward gems={result.daily_goal.chest_gems} />;
    case "achievement": {
      const achievement = result.achievements[step.index];
      return achievement ? <AchievementUnlocked achievement={achievement} /> : null;
    }
  }
}

/** After completion: lesson complete -> streak -> daily goal -> chest -> achievements. */
export function Celebration({ stepIndex, onContinue, ...content }: CelebrationProps) {
  const reviewLesson =
    content.step.kind === "complete" ? (
      <Button
        variant="outline"
        size="lg"
        aria-disabled="true"
        className="w-full text-disabled md:w-auto md:min-w-[150px]"
        onClick={() => toast(lessonStrings.reviewLessonSoon, { id: "review-lesson-soon" })}
      >
        {lessonStrings.reviewLesson}
      </Button>
    ) : undefined;

  return (
    <CelebrationLayout key={stepIndex} onContinue={onContinue} secondary={reviewLesson}>
      <StepContent {...content} />
    </CelebrationLayout>
  );
}
