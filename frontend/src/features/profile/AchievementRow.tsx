import type { ReactNode } from "react";

import { Bolt, Crown, Flame, Medal, Star, Target, Trophy } from "@/components/icons";
import { ProgressBar } from "@/components/ui";
import type { AchievementView } from "@/lib/api/types";
import { formatCount } from "@/lib/format";

import { profileStrings } from "./strings";

/** Artwork per achievement; unknown keys fall back to a medal. */
const BADGE_ART: Record<string, ReactNode> = {
  wildfire: <Flame size={36} />,
  sage: <Bolt size={36} />,
  sharpshooter: <Target size={36} />,
  champion: <Trophy size={36} />,
  overachiever: <Star size={36} fill="currentColor" className="text-gold" />,
  legendary: <Crown size={36} />,
};

/** One achievement: a badge in its colour with the level, then progress towards the next level. */
export function AchievementRow({ achievement }: { achievement: AchievementView }) {
  const { name, description, level, max_level: maxLevel, progress, target, color } = achievement;
  const maxed = level >= maxLevel && progress >= target;
  return (
    <li className="flex gap-4 p-4 md:gap-5 md:p-5">
      <div
        className="flex h-[92px] w-[76px] shrink-0 flex-col items-center justify-between rounded-tile pt-2.5 pb-2"
        style={{
          backgroundColor: color,
          boxShadow: `0 4px 0 color-mix(in srgb, ${color} 70%, black)`,
        }}
      >
        <span className="grid size-[52px] place-items-center rounded-full bg-white/90">
          {BADGE_ART[achievement.key] ?? <Medal place={1} size={36} />}
        </span>
        <span className="text-[11px] leading-none font-extrabold tracking-[0.5px] text-white uppercase">
          {profileStrings.level(level)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lead font-bold text-title">{name}</h3>
          <span className="shrink-0 text-muted">
            {maxed
              ? profileStrings.maxLevel
              : profileStrings.progress(formatCount(progress), formatCount(target))}
          </span>
        </div>
        <ProgressBar
          value={target > 0 ? progress / target : 1}
          color="gold"
          className="mt-3"
          aria-label={profileStrings.achievementLabel(name, level, maxLevel)}
        />
        <p className="mt-3 text-muted">{description}</p>
      </div>
    </li>
  );
}
