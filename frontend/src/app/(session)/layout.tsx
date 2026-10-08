import type { ReactNode } from "react";

/** Lessons and practice run full screen: no sidebar, rail or tab bar. */
export default function SessionLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-surface">{children}</div>;
}
