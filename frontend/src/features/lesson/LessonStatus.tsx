import type { ReactNode } from "react";

import { Mascot, type MascotPose } from "@/components/mascot";

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
