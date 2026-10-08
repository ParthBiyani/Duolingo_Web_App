"use client";

import { StatsBar } from "./stats-bar";

/**
 * Stats bar pinned to the top whenever the right rail is hidden (below
 * 1160px): full width on phones, centred over the content column above that.
 * Its height is exposed as `--shell-top` (set in the (main) layout) so pages
 * can place their own sticky headers right under it.
 */
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-border bg-surface px-3 md:px-6 xl:hidden">
      <StatsBar className="mx-auto h-14 max-w-150 justify-between" />
    </header>
  );
}
