import type { ReactNode } from "react";

import { Mascot, type MascotPose } from "@/components/mascot";
import { Skeleton } from "@/components/ui";

import { lessonStrings } from "./strings";

/** Placeholder shaped like a choice exercise while the session starts. */
export function LessonSkeleton() {
  return (
    <div
      role="status"
      aria-label={lessonStrings.loading}
      className="mx-auto flex w-full max-w-[600px] flex-1 flex-col justify-center gap-6 px-4 py-6 md:gap-8 md:px-0"
    >
      <Skeleton className="h-9 w-3/4 rounded-tile md:h-10" />
      <div className="flex items-end gap-3">
        <Skeleton className="h-[120px] w-[88px] rounded-panel md:w-[136px]" />
        <Skeleton className="mb-10 h-14 w-56 rounded-panel" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[60px] w-full rounded-tile" />
        <Skeleton className="h-[60px] w-full rounded-tile" />
        <Skeleton className="h-[60px] w-full rounded-tile" />
      </div>
    </div>
  );
}

interface StatusMessageProps {
  pose: MascotPose;
  title: string;
  body?: string;
  /** Extra actions under the text (e.g. retry and back links). */
  children?: ReactNode;
  live?: "polite" | "assertive";
}

/** Centred mascot + message used for errors, saving and a failed legendary run. */
export function StatusMessage({
  pose,
  title,
  body,
  children,
  live = "polite",
}: StatusMessageProps) {
  return (
    <div
      role={live === "assertive" ? "alert" : "status"}
      className="mx-auto flex w-full max-w-[600px] flex-1 flex-col items-center justify-center gap-4 px-4 py-6 text-center"
    >
      <Mascot pose={pose} size={160} />
      <h1 className="text-heading text-title">{title}</h1>
      {body ? <p className="max-w-[420px] text-base text-muted">{body}</p> : null}
      {children}
    </div>
  );
}
