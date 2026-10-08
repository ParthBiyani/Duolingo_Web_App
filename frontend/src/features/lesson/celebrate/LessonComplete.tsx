"use client";

import type { CSSProperties, ReactNode } from "react";

import { Bolt, Clock, Heart, Target } from "@/components/icons";
import { Mascot } from "@/components/mascot";
import type { CompletionResult, SessionKind } from "@/lib/api";

import { cx } from "../cx";
import { lessonStrings } from "../strings";
import { accuracyTier, formatDuration, formatPercent } from "./stats";
import { useConfetti } from "./useConfetti";

type Tone = "gold" | "green" | "blue";

const TONE: Record<Tone, { frame: string; value: string }> = {
  gold: { frame: "border-gold bg-gold", value: "text-gold" },
  green: { frame: "border-green bg-green", value: "text-green" },
  blue: { frame: "border-blue bg-blue", value: "text-blue" },
};

interface StatCardProps {
  tone: Tone;
  label: string;
  icon: ReactNode;
  value: ReactNode;
  /** Position in the row; cards pop in one after another. */
  order: number;
}

/** Coloured frame with a caps label on top and the value in a white inner box. */
function StatCard({ tone, label, icon, value, order }: StatCardProps) {
  const style: CSSProperties = {
    animationDelay: `${150 + order * 150}ms`,
    animationFillMode: "both",
  };
  return (
    <div
      style={style}
      className={cx("w-[136px] animate-pop rounded-panel border-2 md:w-[152px]", TONE[tone].frame)}
    >
      <p className="px-2 pt-1 pb-1 text-caps text-surface uppercase">{label}</p>
      <p
        className={cx(
          "flex items-center justify-center gap-2 rounded-[14px] bg-surface py-4 text-[20px] leading-6 font-extrabold",
          TONE[tone].value,
        )}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}

interface LessonCompleteProps {
  result: CompletionResult;
  kind: SessionKind;
  animations: boolean;
}

/** First celebration screen: mascot, confetti, gold title, XP and accuracy (and time) cards. */
export function LessonComplete({ result, kind, animations }: LessonCompleteProps) {
  useConfetti(animations);
  const tier = accuracyTier(result.accuracy_pct);

  return (
    <>
      <Mascot pose="celebrate" size={220} className="h-auto w-[170px] md:w-[220px]" />
      <h1 className="text-display text-gold">{lessonStrings.completeTitle[kind]}</h1>
      <div className="flex flex-wrap justify-center gap-3 md:gap-4">
        <StatCard
          order={0}
          tone="gold"
          label={lessonStrings.totalXp}
          icon={<Bolt size={24} />}
          value={result.xp.total}
        />
        <StatCard
          order={1}
          tone="green"
          label={lessonStrings.accuracy[tier]}
          icon={<Target size={24} />}
          value={formatPercent(result.accuracy_pct)}
        />
        {kind === "timed" ? (
          <StatCard
            order={2}
            tone="blue"
            label={lessonStrings.timeCard}
            icon={<Clock size={24} />}
            value={formatDuration(result.duration_seconds)}
          />
        ) : null}
      </div>
      {result.hearts_earned > 0 ? (
        <p className="flex items-center gap-2 text-lead font-bold text-red">
          <Heart size={26} />
          {lessonStrings.heartsEarned(result.hearts_earned)}
        </p>
      ) : null}
    </>
  );
}
