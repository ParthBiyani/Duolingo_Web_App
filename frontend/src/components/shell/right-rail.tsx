"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Bolt, Chest, ChestOpen, Lock, Shield } from "@/components/icons";
import { Mascot } from "@/components/mascot";
import { Button, cn, ProgressBar, Skeleton, toast } from "@/components/ui";
import { strings } from "@/content/strings";
import { useLeaderboard, useMe, useQuests, type DailyQuest } from "@/lib/api";

import { StatsBar } from "./stats-bar";

const showComingSoon = () => toast(strings.common.comingSoon, { id: "coming-soon" });

const linkCaps =
  "rounded-md text-caps text-blue uppercase transition-[filter] hover:brightness-110";

function RailCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-rail border-2 border-border px-6 py-5", className)}>
      {children}
    </section>
  );
}

function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lead font-bold text-title">{title}</h2>
      {action}
    </div>
  );
}

function CardSkeleton() {
  return (
    <RailCard>
      <Skeleton className="h-6 w-40" />
      <div className="mt-5 flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </RailCard>
  );
}

// Super (placeholder) ------------------------------------------------------------

function SuperCard() {
  return (
    <RailCard>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-lg bg-linear-to-r from-purple to-blue px-2 py-1 text-caps text-white uppercase">
            {strings.rail.super.badge}
          </span>
          <h2 className="mt-3 text-lead font-bold text-title">{strings.rail.super.title}</h2>
          <p className="mt-2 text-muted">{strings.rail.super.body}</p>
        </div>
        <Mascot pose="cheer" size={80} className="shrink-0 self-center" />
      </div>
      <Button variant="super" fullWidth className="mt-5" onClick={showComingSoon}>
        {strings.rail.super.cta}
      </Button>
    </RailCard>
  );
}

// League -----------------------------------------------------------------------------

function LeagueCard() {
  const { data: me } = useMe();
  const { data: board } = useLeaderboard();
  const league = me?.stats.league;
  if (!league) return <CardSkeleton />;

  if (!league.unlocked && !board?.unlocked) {
    return (
      <RailCard>
        <CardHeader title={strings.rail.league.lockedTitle} />
        <div className="mt-4 flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-locked-face">
            <Lock size={28} />
          </span>
          <p className="text-muted">
            {board
              ? strings.rail.league.locked(board.lessons_to_unlock)
              : strings.rail.league.lockedUnknown}
          </p>
        </div>
      </RailCard>
    );
  }

  const myRow = board?.rows.find((row) => row.is_me);
  const tierColor = board?.tiers.find((tier) => tier.tier === league.tier)?.color;

  return (
    <RailCard>
      <CardHeader
        title={strings.rail.league.title(league.name)}
        action={
          <Link href="/leaderboard" className={linkCaps}>
            {strings.rail.league.view}
          </Link>
        }
      />
      <div className="mt-4 flex items-center gap-4">
        <Shield size={56} color={tierColor} className="shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-title">
            {myRow ? strings.rail.league.rank(myRow.rank) : strings.rail.league.rankPending}
          </p>
          {myRow ? <p className="mt-1 text-muted">{strings.rail.league.xp(myRow.xp)}</p> : null}
        </div>
      </div>
    </RailCard>
  );
}

// Daily quests -------------------------------------------------------------------

function QuestRow({ quest }: { quest: DailyQuest }) {
  const shown = Math.min(quest.progress, quest.target);
  return (
    <li className="flex items-center gap-4">
      <Bolt size={40} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-title">{quest.title}</p>
        <div className="mt-2 flex items-center gap-3">
          <ProgressBar
            value={quest.target > 0 ? shown / quest.target : 0}
            color="gold"
            label={strings.rail.quests.progress(shown, quest.target)}
            aria-label={quest.title}
          />
          {quest.completed ? (
            <ChestOpen size={32} className="shrink-0" />
          ) : (
            <Chest size={32} className="shrink-0" />
          )}
        </div>
      </div>
    </li>
  );
}

function DailyQuestsCard() {
  const { data } = useQuests();
  if (!data) return <CardSkeleton />;

  return (
    <RailCard>
      <CardHeader
        title={strings.rail.quests.title}
        action={
          <Link href="/quests" className={linkCaps}>
            {strings.common.viewAll}
          </Link>
        }
      />
      {data.daily.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-5">
          {data.daily.map((quest) => (
            <QuestRow key={quest.key} quest={quest} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-muted">{strings.rail.quests.empty}</p>
      )}
    </RailCard>
  );
}

// Footer -------------------------------------------------------------------------

function RailFooter() {
  return (
    <footer aria-label={strings.rail.footer.label} className="px-4 pb-2 text-center">
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        {strings.rail.footer.links.map((label) => (
          <li key={label}>
            <button
              type="button"
              onClick={showComingSoon}
              className="rounded-md text-caps text-disabled uppercase transition-colors hover:text-muted"
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-caps font-medium tracking-normal text-disabled">
        {strings.rail.footer.disclaimer}
      </p>
    </footer>
  );
}

/**
 * Right column from 1160px: stats, promos, league and quests. It is sticky but
 * not a scroll container of its own, so the document is the only scroller.
 */
export function RightRail() {
  return (
    <aside
      aria-label={strings.rail.label}
      className="sticky top-0 hidden w-92 shrink-0 flex-col gap-5 self-start py-6 xl:flex"
    >
      <StatsBar className="justify-between px-2" />
      <SuperCard />
      <LeagueCard />
      <DailyQuestsCard />
      <RailFooter />
    </aside>
  );
}
