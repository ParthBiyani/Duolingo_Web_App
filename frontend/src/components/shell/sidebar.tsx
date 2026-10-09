"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Mascot } from "@/components/mascot";
import { strings } from "@/content/strings";

import { MoreMenu } from "./more-menu";
import { isActivePath, MORE_ROUTES, NAV_ITEMS, sidebarItemClassName } from "./nav-items";

/**
 * Left navigation from 700px: 88px wide with icons only, 256px with the
 * wordmark and caps labels from 1024px.
 */
export function Sidebar() {
  const pathname = usePathname();
  const moreActive = MORE_ROUTES.some((href) => isActivePath(pathname, href));

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-22 flex-col border-r-2 border-border bg-surface px-3 pt-6 pb-4 md:flex lg:w-64 lg:px-4">
      <Link
        href="/learn"
        aria-label={strings.brand.homeLabel}
        className="mb-4 flex h-14 items-center justify-center rounded-xl lg:justify-start lg:px-4"
      >
        <span
          aria-hidden="true"
          className="hidden font-display text-display tracking-tight text-green lg:block"
        >
          {strings.brand.wordmark}
        </span>
        <Mascot pose="idle" size={44} className="lg:hidden" />
      </Link>

      <nav aria-label={strings.nav.label} className="flex flex-col gap-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={sidebarItemClassName(active)}
            >
              <Icon size={32} className="shrink-0" />
              <span className="sr-only lg:not-sr-only">{label}</span>
            </Link>
          );
        })}
        <MoreMenu placement="sidebar" active={moreActive} />
      </nav>
    </aside>
  );
}
