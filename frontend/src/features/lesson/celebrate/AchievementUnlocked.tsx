import { Gem, Trophy } from "@/components/icons";
import type { AchievementUnlock } from "@/lib/api";

import { lessonStrings } from "../strings";

/** One screen per achievement level reached in this session. */
export function AchievementUnlocked({ achievement }: { achievement: AchievementUnlock }) {
  return (
    <>
      <p className="text-caps text-muted uppercase">{lessonStrings.achievementTitle}</p>
      <div className="relative grid size-[150px] animate-pop place-items-center rounded-full border-4 border-gold bg-surface-hover">
        <Trophy size={88} />
        <span className="absolute -bottom-3 rounded-full bg-gold px-3 py-1 text-caps text-surface uppercase">
          {lessonStrings.achievementLevel(achievement.level)}
        </span>
      </div>
      <h1 className="mt-2 text-display text-title">{achievement.name}</h1>
      <p className="max-w-[400px] text-base text-muted">{achievement.description}</p>
      {achievement.gems > 0 ? (
        <p className="flex items-center gap-2 text-lead font-bold text-blue">
          <Gem size={26} />
          {lessonStrings.plusGems(achievement.gems)}
        </p>
      ) : null}
    </>
  );
}
