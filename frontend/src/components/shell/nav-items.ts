import type { ComponentType } from "react";

import { Chest, House, ProfileIcon, Shield, Store, type IconProps } from "@/components/icons";
import { cn } from "@/components/ui";
import { strings } from "@/content/strings";

export interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
}

/** Primary destinations, shared by the sidebar and the mobile tab bar. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/learn", label: strings.nav.learn, Icon: House },
  { href: "/leaderboard", label: strings.nav.leaderboards, Icon: Shield },
  { href: "/quests", label: strings.nav.quests, Icon: Chest },
  { href: "/shop", label: strings.nav.shop, Icon: Store },
  { href: "/profile", label: strings.nav.profile, Icon: ProfileIcon },
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
    "flex h-13 w-full items-center justify-center gap-5 rounded-xl border-2 px-2 text-button uppercase outline-offset-0 transition-colors lg:justify-start lg:px-4",
    active
      ? "border-selected-border bg-selected-bg text-selected-text"
      : "border-transparent text-muted hover:bg-surface-hover data-[state=open]:bg-surface-hover",
  );
}

/** Mobile tab bar cell: icon only. */
export function tabItemClassName(active: boolean): string {
  return cn(
    "grid size-13 place-items-center rounded-xl border-2 outline-offset-0 transition-colors",
    active
      ? "border-selected-border bg-selected-bg"
      : "border-transparent hover:bg-surface-hover data-[state=open]:bg-surface-hover",
  );
}
