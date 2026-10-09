"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { cn, Skeleton } from "@/components/ui";
import { strings } from "@/content/strings";
import { queryKeys, useMe } from "@/lib/api";
import { useServerOffset } from "@/lib/time";

import {
  CoursePopover,
  GemsPopover,
  HeartsPopover,
  StreakPopover,
  XpPopover,
} from "./stat-popovers";

/** Refetches /me just after the next heart regenerates, so the count ticks up on its own. */
function useRefreshWhenHeartRegenerates(nextHeartAt: string | null | undefined) {
  const queryClient = useQueryClient();
  const offset = useServerOffset();

  useEffect(() => {
    if (!nextHeartAt) return;
    const delay = Date.parse(nextHeartAt) - (Date.now() + offset) + 1000;
    const timer = window.setTimeout(
      () => void queryClient.invalidateQueries({ queryKey: queryKeys.me }),
      Math.max(delay, 1000),
    );
    return () => window.clearTimeout(timer);
  }, [nextHeartAt, offset, queryClient]);
}

/**
 * Course flag, streak, XP, gems and hearts, each opening its popover. Shows
 * placeholders until /me answers (or while the API is unreachable).
 * Callers choose the spacing, e.g. `className="justify-between"`.
 */
export function StatsBar({ className }: { className?: string }) {
  const { data: me } = useMe();
  useRefreshWhenHeartRegenerates(me?.stats.next_heart_at);

  return (
    <div
      role="group"
      aria-label={strings.stats.label}
      className={cn("flex items-center", className)}
    >
      {me ? (
        <>
          <CoursePopover course={me.course} />
          <StreakPopover streak={me.stats.streak} />
          <XpPopover stats={me.stats} />
          <GemsPopover gems={me.stats.gems} />
          <HeartsPopover stats={me.stats} />
        </>
      ) : (
        Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-16 rounded-xl" />
        ))
      )}
    </div>
  );
}
