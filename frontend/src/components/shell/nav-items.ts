import type { ComponentType } from "react";

import {
  Dumbbell,
  House,
  NavLeaderboards,
  NavQuests,
  Store,
  type IconProps,
} from "@/components/icons";
import { cn } from "@/components/ui";
import { strings } from "@/content/strings";

import { ProfileNavIcon } from "./profile-nav-icon";

export interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
}

/** Primary destinations, shared by the sidebar and the mobile tab bar. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/learn", label: strings.nav.learn, Icon: House },
  { href: "/practice-hub", label: strings.nav.practice, Icon: Dumbbell },
  { href: "/leaderboard", label: strings.nav.leaderboards, Icon: NavLeaderboards },
  { href: "/quests", label: strings.nav.quests, Icon: NavQuests },
  { href: "/shop", label: strings.nav.shop, Icon: Store },
  { href: "/profile", label: strings.nav.profile, Icon: ProfileNavIcon },
];

/** Routes reached through the MORE menu, which is highlighted while one is open. */
export const MORE_ROUTES = ["/settings"] as const;

export const SETTINGS_HREF = "/settings/preferences";

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar row: icon-only and centred between 700 and 1023px, icon plus caps
 * label from 1024px. The selected row gets the blue tint and border.
 */
export function sidebarItemClassName(active: boolean): string {
  return cn(
    "flex h-[51px] w-full items-center justify-center gap-5 rounded-xl border-2 px-2 text-button leading-[25px] uppercase outline-offset-0 transition-colors lg:justify-start lg:px-3.5",
    active
      ? "border-selected-border bg-selected-bg text-blue"
      : "border-transparent text-muted hover:bg-surface-hover data-[state=open]:bg-surface-hover dark:text-body",
  );
}

/** Mobile tab bar cell: icon only, a little smaller on the narrowest phones so all seven fit. */
export function tabItemClassName(active: boolean): string {
  return cn(
    "grid size-12 place-items-center rounded-xl min-[400px]:size-13 border-2 outline-offset-0 transition-colors",
    active
      ? "border-selected-border bg-selected-bg"
      : "border-transparent hover:bg-surface-hover data-[state=open]:bg-surface-hover",
  );
}
