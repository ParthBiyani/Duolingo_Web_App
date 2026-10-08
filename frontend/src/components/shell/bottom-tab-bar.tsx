"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { strings } from "@/content/strings";

import { MoreMenu } from "./more-menu";
import { isActivePath, MORE_ROUTES, NAV_ITEMS, tabItemClassName } from "./nav-items";

/** Icon tab bar fixed to the bottom of the screen below 700px. */
export function BottomTabBar() {
  const pathname = usePathname();
  const moreActive = MORE_ROUTES.some((href) => isActivePath(pathname, href));

  return (
    <nav
      aria-label={strings.nav.label}
      className="fixed inset-x-0 bottom-0 z-40 flex min-h-18 items-center justify-around border-t-2 border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={tabItemClassName(active)}
          >
            <Icon size={32} />
            <span className="sr-only">{label}</span>
          </Link>
        );
      })}
      <MoreMenu placement="tabs" active={moreActive} />
    </nav>
  );
}
