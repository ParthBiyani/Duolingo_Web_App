import Link from "next/link";
import type { ReactNode } from "react";

import { Clock, Dumbbell } from "@/components/icons";
import { Mascot } from "@/components/mascot";
import { buttonClassName } from "@/components/ui";

import { practiceStrings } from "./strings";

interface PracticeMode {
  href: string;
  icon: ReactNode;
  name: string;
  description: string;
}

const MODES: readonly PracticeMode[] = [
  {
    href: "/practice",
    icon: <Dumbbell size={64} />,
    name: practiceStrings.practice.name,
    description: practiceStrings.practice.description,
  },
  {
    href: "/timed",
    icon: <Clock size={64} />,
    name: practiceStrings.timed.name,
    description: practiceStrings.timed.description,
  },
];

/** Practice hub: the ways to practise outside the path, each opening its own session. */
export function PracticeHub() {
  return (
    <div className="mx-auto w-full max-w-[600px] pt-6 pb-16">
      <h1 className="sr-only">{practiceStrings.pageTitle}</h1>

      <section className="flex items-center justify-between gap-4 overflow-hidden rounded-rail bg-blue py-5 pr-4 pl-6 text-white">
        <div className="min-w-0">
          <h2 className="text-heading">{practiceStrings.bannerTitle}</h2>
          <p className="mt-2 max-w-sm">{practiceStrings.bannerBody}</p>
        </div>
        <Mascot pose="cheer" size={112} className="shrink-0 max-md:h-auto max-md:w-20" />
      </section>

      <section aria-labelledby="practice-modes" className="mt-10">
        <h2 id="practice-modes" className="pb-4 text-heading text-title">
          {practiceStrings.modes}
        </h2>
        <ul>
          {MODES.map((mode) => (
            <PracticeRow key={mode.href} mode={mode} />
          ))}
        </ul>
      </section>
    </div>
  );
}

/** One mode: artwork, name, what it involves and a START button. The button drops below on phones. */
function PracticeRow({ mode }: { mode: PracticeMode }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-4 border-t-2 border-border py-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-6">
      <div className="grid size-16 place-items-center md:size-20">{mode.icon}</div>
      <div>
        <h3 className="text-lead font-bold text-title">{mode.name}</h3>
        <p className="mt-1 text-muted">{mode.description}</p>
      </div>
      <div className="col-span-2 flex justify-end md:col-span-1">
        <Link
          href={mode.href}
          aria-label={practiceStrings.startLabel(mode.name)}
          className={buttonClassName({ variant: "primary", className: "min-w-32" })}
        >
          {practiceStrings.start}
        </Link>
      </div>
    </li>
  );
}
