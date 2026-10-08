import type { ReactNode } from "react";

import { BottomTabBar, MobileTopBar, RightRail, Sidebar } from "@/components/shell";
import { strings } from "@/content/strings";

/**
 * App shell for the main tabs. Breakpoints (see globals.css):
 *  - below 700px: stats bar on top, icon tab bar at the bottom;
 *  - md, 700px: 88px icon sidebar (the stats bar stays on top);
 *  - lg, 1024px: 256px sidebar with labels;
 *  - xl, 1160px: 368px right rail, which takes over the stats bar, next to
 *    the 600px content column.
 * `--shell-top` is the height of the sticky stats bar above the content, so
 * pages with sticky headers can sit under it (`top-(--shell-top)`).
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="[--shell-top:3.625rem] xl:[--shell-top:0px]">
      <a
        href="#main-content"
        className="sr-only rounded-xl bg-surface px-4 py-3 font-bold text-blue focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        {strings.common.skipToContent}
      </a>
      <Sidebar />
      <div className="md:pl-22 lg:pl-64">
        <MobileTopBar />
        {/* 600px column + 48px gap + 368px rail + 2 x 24px padding = 1064px. */}
        <div className="mx-auto flex w-full max-w-266 justify-center gap-12 px-4 md:px-6">
          <main id="main-content" className="w-full max-w-150 min-w-0 pb-28 md:pb-12">
            {children}
          </main>
          <RightRail />
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
}
