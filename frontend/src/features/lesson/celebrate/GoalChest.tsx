import { Bolt, Chest, ChestOpen, Gem } from "@/components/icons";
import { ProgressBar } from "@/components/ui";
import type { CompletionResult } from "@/lib/api";

import { lessonStrings } from "../strings";

type DailyGoal = CompletionResult["daily_goal"];

/** Step 1: the "Earn N XP" daily quest card, filled to N / N, with its chest. */
export function GoalReached({ goal }: { goal: DailyGoal }) {
  const done = Math.min(goal.today_xp, goal.goal_xp);
  return (
    <>
      <Chest size={160} className="h-auto w-[120px] animate-pop md:w-[160px]" />
      <h1 className="text-display text-title">{lessonStrings.goalTitle}</h1>
      <div className="w-full max-w-[420px] animate-pop rounded-panel border-2 border-border p-4 text-left">
        <div className="flex items-center gap-4">
          <Bolt size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-lead font-bold text-title">{lessonStrings.earnXp(goal.goal_xp)}</p>
            <ProgressBar
              className="mt-2"
              value={goal.goal_xp > 0 ? done / goal.goal_xp : 1}
              color="gold"
              label={lessonStrings.goalProgress(done, goal.goal_xp)}
              aria-label={lessonStrings.earnXp(goal.goal_xp)}
            />
          </div>
          <Chest size={48} />
        </div>
      </div>
    </>
  );
}

/** Step 2: the chest opens and pays out its gems. */
export function ChestReward({ gems }: { gems: number }) {
  return (
    <>
      <ChestOpen size={180} className="h-auto w-[140px] animate-pop md:w-[180px]" />
      <h1 className="text-display text-title">{lessonStrings.chestTitle(gems)}</h1>
      <p className="flex items-center gap-2 text-heading text-blue">
        <Gem size={32} />
        {lessonStrings.plusGems(gems)}
      </p>
      <p className="max-w-[400px] text-base text-muted">{lessonStrings.chestBody}</p>
    </>
  );
}
