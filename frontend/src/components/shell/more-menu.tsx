"use client";

import Link from "next/link";

import { Dots } from "@/components/icons";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger, toast } from "@/components/ui";
import { strings } from "@/content/strings";

import { SETTINGS_HREF, sidebarItemClassName, tabItemClassName } from "./nav-items";

interface MoreMenuProps {
  /** "sidebar" opens to the right of the rail; "tabs" opens upwards from the tab bar. */
  placement: "sidebar" | "tabs";
  active: boolean;
}

/** The MORE entry: Settings and Help. */
export function MoreMenu({ placement, active }: MoreMenuProps) {
  const inSidebar = placement === "sidebar";

  return (
    <Dropdown>
      <DropdownTrigger
        className={inSidebar ? sidebarItemClassName(active) : tabItemClassName(active)}
      >
        <Dots size={32} className="shrink-0" />
        <span className={inSidebar ? "sr-only lg:not-sr-only" : "sr-only"}>{strings.nav.more}</span>
      </DropdownTrigger>
      <DropdownContent side={inSidebar ? "right" : "top"} align="end">
        <DropdownItem asChild>
          <Link href={SETTINGS_HREF}>{strings.nav.settings}</Link>
        </DropdownItem>
        <DropdownItem onSelect={() => toast(strings.common.comingSoon, { id: "help" })}>
          {strings.nav.help}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
