"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  Bolt,
  ChestOpen,
  DuoImage,
  LeagueBadge,
  QuestChest,
  SuperLogo,
  SuperOwl,
} from "@/components/icons";
import { cn, ProgressBar, Skeleton, toast } from "@/components/ui";
import { strings } from "@/content/strings";
import { useLeaderboard, useMe, useQuests, type DailyQuest } from "@/lib/api";

import { StatsBar } from "./stats-bar";

const showComingSoon = () => toast(strings.common.comingSoon, { id: "coming-soon" });

const linkCaps =
  "rounded-md text-button leading-[18px] text-blue uppercase transition-[filter] hover:brightness-110";

function RailCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-rail border-2 border-border px-5 py-[18px]", className)}>
      {children}
    </section>
  );
}

function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lead leading-7 font-bold text-title">{title}</h2>
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
      <div className="relative">
        <SuperLogo size={78} title={strings.rail.super.badge} />
        <SuperOwl size={98} className="absolute -top-1 -right-1" />
        <h2 className="mt-3 pr-24 text-lead leading-7 font-bold text-title">
          {strings.rail.super.title}
        </h2>
        <p className="mt-1.5 pr-20 leading-[25px] text-muted dark:text-body">
          {strings.rail.super.body}
        </p>
      </div>
      <button
        type="button"
        onClick={showComingSoon}
        className="mt-6 flex h-[50px] w-full items-center justify-center rounded-button bg-super text-button text-white uppercase shadow-[0_4px_0_var(--super-shade)] transition-[translate,box-shadow,filter] duration-100 hover:brightness-110 active:translate-y-1 active:shadow-none"
      >
        {strings.rail.super.cta}
      </button>
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
        <div className="mt-7 flex items-center gap-3">
          <DuoImage name="leagues-unlock" size={70} className="shrink-0" />
          <p className="leading-[25px] text-muted dark:text-body">
            {board
              ? strings.rail.league.locked(board.lessons_to_unlock)
              : strings.rail.league.lockedUnknown}
          </p>
        </div>
      </RailCard>
    );
  }

  const myRow = board?.rows.find((row) => row.is_me);
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
        <LeagueBadge tier={league.tier} size={56} className="shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-title">
            {myRow ? strings.rail.league.rank(myRow.rank) : strings.rail.league.rankPending}
          </p>
          {myRow ? (
            <p className="mt-1 text-muted dark:text-body">{strings.rail.league.xp(myRow.xp)}</p>
          ) : null}
        </div>
      </div>
    </RailCard>
  );
}

// Daily quests -------------------------------------------------------------------

function QuestRow({ quest }: { quest: DailyQuest }) {
  const shown = Math.min(quest.progress, quest.target);
  return (
    <li className="flex items-center gap-[22px]">
      <Bolt size={60} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="leading-6 font-bold text-title">{quest.title}</p>
        <div className="mt-3 flex items-center">
          <ProgressBar
            value={quest.target > 0 ? shown / quest.target : 0}
            color="gold"
            label={strings.rail.quests.progress(shown, quest.target)}
            aria-label={quest.title}
          />
          {quest.completed ? (
            <ChestOpen size={35} className="-ml-1 shrink-0" />
          ) : (
            <QuestChest size={35} className="-ml-1 shrink-0" />
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
      className="sticky top-0 hidden w-92 shrink-0 flex-col gap-4 self-start py-6 xl:flex"
    >
      <StatsBar className="mb-2 justify-between px-2" />
      <SuperCard />
      <LeagueCard />
      <DailyQuestsCard />
      <RailFooter />
    </aside>
  );
}
