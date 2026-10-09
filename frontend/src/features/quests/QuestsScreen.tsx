"use client";

import { Bolt, ChestOpen, Clock, DuoImage, QuestChest } from "@/components/icons";
import { Mascot } from "@/components/mascot";
import { Button, ProgressBar, Skeleton } from "@/components/ui";
import { useQuests, type DailyQuest } from "@/lib/api";
import { formatTimeLeft, useServerNow } from "@/lib/time";

import { questsStrings } from "./strings";

/** Quests page: welcome banner, today's quests with a live reset countdown, and what's next. */
export function QuestsScreen() {
  const quests = useQuests();

  if (quests.isPending) return <QuestsSkeleton />;

  if (quests.isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <Mascot pose="sad" size={140} />
        <h1 className="text-heading text-title">{questsStrings.loadErrorTitle}</h1>
        <p className="text-muted">{questsStrings.loadErrorBody}</p>
        <Button
          variant="secondary"
          loading={quests.isFetching}
          onClick={() => void quests.refetch()}
        >
          {questsStrings.retry}
        </Button>
      </div>
    );
  }

  const { daily, ends_at: endsAt } = quests.data;

  return (
    <div className="mx-auto w-full max-w-[600px] pt-6 pb-16">
      <h1 className="sr-only">{questsStrings.pageTitle}</h1>

      <section className="flex min-h-[232px] items-center justify-between gap-4 overflow-hidden rounded-rail bg-quests-banner pr-6 pl-6 text-on-green">
        <div className="min-w-0">
          <h2 className="text-[25px] leading-[34px] font-bold">{questsStrings.bannerTitle}</h2>
          <p className="mt-2 max-w-sm leading-6">{questsStrings.bannerBody}</p>
        </div>
        <DuoImage name="quests-hero" size={172} className="shrink-0 max-md:w-28" />
      </section>

      <section aria-labelledby="daily-quests-heading" className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 id="daily-quests-heading" className="text-[25px] leading-7 font-bold text-title">
            {questsStrings.dailyQuests}
          </h2>
          <QuestTimeLeft endsAt={endsAt} />
        </div>

        {daily.length > 0 ? (
          <ul className="mt-4 divide-y-2 divide-border rounded-rail border-2 border-border">
            {daily.map((quest) => (
              <QuestRow key={quest.key} quest={quest} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">{questsStrings.empty}</p>
        )}

        <div className="mt-4 flex min-h-[99px] items-center gap-6 rounded-rail border-2 border-border bg-raised px-5">
          <DuoImage name="quests-locked" size={60} className="shrink-0" />
          <p className="text-lead leading-7 font-bold text-disabled">
            {questsStrings.moreSoonTitle}
          </p>
        </div>
      </section>
    </div>
  );
}

function QuestRow({ quest }: { quest: DailyQuest }) {
  const value = quest.target > 0 ? quest.progress / quest.target : 0;
  return (
    <li className="flex items-center gap-4 p-4">
      <Bolt size={60} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-lead font-bold text-title">{quest.title}</p>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar
            value={value}
            color="gold"
            className="h-5"
            label={questsStrings.progress(quest.progress, quest.target)}
            aria-label={questsStrings.progressLabel(quest.title, quest.progress, quest.target)}
          />
          {quest.completed ? (
            <ChestOpen size={40} title={questsStrings.completed} className="shrink-0" />
          ) : (
            <QuestChest
              size={40}
              title={questsStrings.reward(quest.chest_gems)}
              className="shrink-0"
            />
          )}
        </div>
      </div>
    </li>
  );
}

/** "12 hours" until the quests reset, measured on the server clock. */
function QuestTimeLeft({ endsAt }: { endsAt: string }) {
  const now = useServerNow();
  return (
    <p className="flex items-center gap-2 text-button text-orange uppercase">
      <Clock size={22} />
      {questsStrings.timeLeft(formatTimeLeft(Date.parse(endsAt) - now))}
    </p>
  );
}

function QuestsSkeleton() {
  return (
    <div
      role="status"
      aria-label={questsStrings.loading}
      className="mx-auto w-full max-w-[600px] pt-6"
    >
      <Skeleton className="h-36 w-full rounded-rail" />
      <div className="mt-8 flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="mt-4 h-28 w-full rounded-rail" />
      <Skeleton className="mt-4 h-24 w-full rounded-rail" />
    </div>
  );
}
