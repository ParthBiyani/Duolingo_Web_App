import Link from "next/link";

import { DuoImage } from "@/components/icons";
import { buttonClassName } from "@/components/ui";

import { leaderboardStrings } from "./strings";

/** Shown until the learner has completed enough lessons to join a league. */
export function LeaderboardLocked({ lessonsToUnlock }: { lessonsToUnlock: number }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <DuoImage name="leagues-locked-hero" size={200} />
      <h1 className="mt-2 text-heading text-title">{leaderboardStrings.lockedTitle}</h1>
      <p className="max-w-sm text-muted">{leaderboardStrings.lockedBody(lessonsToUnlock)}</p>
      <Link href="/learn" className={buttonClassName({ variant: "primary", size: "lg" })}>
        {leaderboardStrings.lockedCta}
      </Link>
    </div>
  );
}
