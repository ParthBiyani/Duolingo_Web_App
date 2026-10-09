"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  Bolt,
  ChestOpen,
  DuoImage,
  LeagueBadge,
  QuestChest,
  SuperLogo,
  SuperOwl,
} from "@/components/icons";
import { buttonClassName, cn, ProgressBar, Skeleton, toast } from "@/components/ui";
import { strings } from "@/content/strings";
import { SettingsNav } from "@/features/settings/SettingsNav";
import { settingsStrings } from "@/features/settings/strings";
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
        className="mt-6 flex h-[50px] w-full items-center justify-center rounded-button border-b-4 border-(--super-shade) bg-super text-button text-white uppercase transition-[translate,filter] duration-100 hover:brightness-110 active:translate-y-0.5 active:border-b-2"
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

// Monthly challenges (quests page) --------------------------------------------------

function MonthlyChallengeCard() {
  return (
    <RailCard>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="leading-7 font-bold text-title">{strings.rail.monthly.title}</h2>
          <p className="mt-2 leading-6 text-muted dark:text-body">{strings.rail.monthly.body}</p>
        </div>
        <DuoImage name="monthly-challenge" size={116} className="-mr-2 shrink-0" />
      </div>
      <Link
        href="/learn"
        className={buttonClassName({ variant: "outline", fullWidth: true, className: "mt-6" })}
      >
        {strings.rail.monthly.cta}
      </Link>
    </RailCard>
  );
}

// Friends (profile page) -------------------------------------------------------------

function FriendsCard() {
  const [tab, setTab] = useState<"following" | "followers">("following");
  return (
    <section className="overflow-hidden rounded-rail border-2 border-border">
      <div role="tablist" className="grid grid-cols-2 border-b-2 border-border">
        {(["following", "followers"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-0.5 h-12 border-b-2 text-button uppercase transition-colors",
              tab === key
                ? "border-blue text-blue"
                : "border-transparent text-muted hover:text-title dark:text-body",
            )}
          >
            {strings.rail.friends[key]}
          </button>
        ))}
      </div>
      <div className="flex flex-col items-center px-4 pt-9 pb-6 text-center">
        <DuoImage name="friends" size={305} />
        <p className="mt-5 px-6 leading-[25px] text-muted dark:text-body">
          {strings.rail.friends.body}
        </p>
      </div>
    </section>
  );
}

function AddFriendsCard() {
  const rows = [
    { key: "find", image: "find-friends", label: strings.rail.friends.find },
    { key: "invite", image: "invite-friends", label: strings.rail.friends.invite },
  ] as const;
  return (
    <RailCard className="px-3">
      <h2 className="px-2 text-lead leading-7 font-bold text-title">
        {strings.rail.friends.addTitle}
      </h2>
      <ul className="mt-4 flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={showComingSoon}
              className="flex w-full items-center gap-6 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-hover"
            >
              <DuoImage name={row.image} size={52} className="shrink-0" />
              <span className="flex-1 font-bold text-title">{row.label}</span>
              <span aria-hidden="true" className="text-[28px] leading-none font-bold text-title">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </RailCard>
  );
}

// Footer -----------------------------------------------------------------------------

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
    </footer>
  );
}

/**
 * Sticky offset that makes the rail behave like the original's: it scrolls with the page until
 * its last card is in view, then stays put (a rail shorter than the window simply stays at the top).
 */
function useStickToBottom() {
  const ref = useRef<HTMLElement>(null);
  const [top, setTop] = useState(0);
  useEffect(() => {
    const rail = ref.current;
    if (!rail) return;
    const update = () => setTop(Math.min(0, window.innerHeight - rail.offsetHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return [ref, top] as const;
}

/**
 * Right column from 1160px: stats, promos, league and quests. It is sticky but
 * not a scroll container of its own, so the document is the only scroller.
 */
export function RightRail() {
  // Like the original, some pages swap the default cards: the profile shows friend features,
  // Quests the monthly challenge, and the Shop drops the Super promo it already leads with.
  const pathname = usePathname();
  const page = (["profile", "quests", "shop"] as const).find((name) =>
    pathname.startsWith(`/${name}`),
  );
  const [railRef, railTop] = useStickToBottom();
  // Settings pages replace the whole rail with their navigation cards.
  if (pathname.startsWith("/settings")) {
    return (
      <aside
        aria-label={settingsStrings.nav.label}
        className="sticky top-0 hidden w-92 shrink-0 self-start py-6 xl:block"
      >
        <SettingsNav />
      </aside>
    );
  }
  return (
    <aside
      ref={railRef}
      aria-label={strings.rail.label}
      style={{ top: railTop }}
      className="sticky hidden w-92 shrink-0 flex-col gap-4 self-start py-6 xl:flex"
    >
      <StatsBar className="mb-2 justify-between px-2" />
      {page === "profile" ? (
        <>
          <FriendsCard />
          <AddFriendsCard />
        </>
      ) : page === "quests" ? (
        <MonthlyChallengeCard />
      ) : (
        <>
          {page === "shop" ? null : <SuperCard />}
          <LeagueCard />
          <DailyQuestsCard />
        </>
      )}
      <RailFooter />
    </aside>
  );
}
