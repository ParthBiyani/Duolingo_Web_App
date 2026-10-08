"use client";

import { motion } from "motion/react";

import { Mascot } from "@/components/mascot";

import { pickVariant, type Interstitial as InterstitialData } from "./queue";
import { lessonStrings } from "./strings";

function messageFor({ kind, combo, roll }: InterstitialData): string {
  switch (kind) {
    case "combo":
      return pickVariant(lessonStrings.comboMessages, roll)(combo);
    case "review":
      return pickVariant(lessonStrings.review, roll);
    default:
      return pickVariant(lessonStrings.motivation, roll);
  }
}

/** Between exercises: the mascot rises from behind the footer with a short message. */
export function Interstitial({ interstitial }: { interstitial: InterstitialData }) {
  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col items-center justify-end overflow-hidden px-4 pt-6">
      <div
        role="status"
        className="relative mb-5 max-w-[420px] animate-pop rounded-panel border-2 border-border bg-surface px-5 py-4 text-center text-lead font-bold text-title"
      >
        {messageFor(interstitial)}
        <span
          aria-hidden="true"
          className="absolute -bottom-[9px] left-1/2 size-4 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-border bg-surface"
        />
      </div>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: "0%" }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
      >
        <Mascot pose="peek" size={240} className="block h-auto w-[170px] md:w-[240px]" />
      </motion.div>
    </div>
  );
}
