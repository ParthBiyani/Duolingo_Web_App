"use client";

import type { ReactNode } from "react";

import { LeagueBadge, StatMedal, StatStreak, StatXp } from "@/components/icons";
import { Mascot } from "@/components/mascot";
import { Button, Skeleton } from "@/components/ui";
import { useLeaderboard, useProfile } from "@/lib/api";
import { formatCount } from "@/lib/format";

import { AchievementRow } from "./AchievementRow";
import { ProfileHeader } from "./ProfileHeader";
import { profileStrings } from "./strings";

/** Profile page: header, a 2x2 statistics grid and the achievements list. */
export function ProfileScreen() {
  const profile = useProfile();
  // Only used to colour the league shield; the leaderboard is usually cached by the right rail.
  const board = useLeaderboard();

  if (profile.isPending) return <ProfileSkeleton />;

  if (profile.isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <Mascot pose="sad" size={140} />
        <h1 className="text-heading text-title">{profileStrings.loadErrorTitle}</h1>
        <p className="text-muted">{profileStrings.loadErrorBody}</p>
        <Button
          variant="secondary"
          loading={profile.isFetching}
          onClick={() => void profile.refetch()}
        >
          {profileStrings.retry}
        </Button>
      </div>
    );
  }

  const { user, course, stats, achievements } = profile.data;
  const leagueTier = board.data?.tiers.find((tier) => tier.name === stats.league_name)?.tier ?? 0;

  return (
    <div className="pt-6 pb-16">
      <ProfileHeader user={user} course={course} />

      <section aria-labelledby="statistics-heading" className="mt-8">
        <h2 id="statistics-heading" className="text-heading text-title">
          {profileStrings.statistics}
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 md:gap-4">
          <StatTile
            icon={<StatStreak size={21} />}
            value={formatCount(stats.streak)}
            label={profileStrings.dayStreak}
          />
          <StatTile
            icon={<StatXp size={21} />}
            value={formatCount(stats.xp_total)}
            label={profileStrings.totalXp}
          />
          <StatTile
            icon={<LeagueBadge tier={leagueTier} size={24} />}
            value={stats.league_name ?? profileStrings.noLeague}
            label={profileStrings.currentLeague}
          />
          <StatTile
            icon={<StatMedal size={21} />}
            value={formatCount(stats.top3_finishes)}
            label={profileStrings.top3}
          />
        </ul>
      </section>

      <section aria-labelledby="achievements-heading" className="mt-8">
        <h2 id="achievements-heading" className="text-heading text-title">
          {profileStrings.achievements}
        </h2>
        <ul className="mt-4 divide-y-2 divide-border rounded-rail border-2 border-border">
          {achievements.map((achievement) => (
            <AchievementRow key={achievement.key} achievement={achievement} />
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Bordered statistic card: icon, value and label. */
function StatTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <li className="flex items-start gap-2.5 rounded-rail border-2 border-border px-3 py-3 md:gap-3 md:px-4">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-lead font-bold text-title">{value}</span>
        <span className="block text-[15px] leading-5 text-muted">{label}</span>
      </span>
    </li>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-label={profileStrings.loading} className="pt-6">
      <Skeleton className="h-52 w-full rounded-rail" />
      <Skeleton className="mt-6 h-8 w-56" />
      <Skeleton className="mt-2 h-5 w-32" />
      <Skeleton className="mt-10 h-7 w-36" />
      <div className="mt-4 grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[72px] rounded-rail" />
        ))}
      </div>
      <Skeleton className="mt-10 h-7 w-40" />
      <Skeleton className="mt-4 h-72 w-full rounded-rail" />
    </div>
  );
}
