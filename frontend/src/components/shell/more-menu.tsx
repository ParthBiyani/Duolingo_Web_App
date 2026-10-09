"use client";

import Link from "next/link";
import { useRef, useState, type PointerEvent } from "react";

import { Dots, DuoImage } from "@/components/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
  toast,
} from "@/components/ui";
import { strings } from "@/content/strings";
import { authStrings } from "@/features/auth/strings";
import { useLogOut } from "@/features/auth/useLogOut";

import { SETTINGS_HREF, sidebarItemClassName, tabItemClassName } from "./nav-items";

interface MoreMenuProps {
  /** "sidebar" opens to the right of the rail; "tabs" opens upwards from the tab bar. */
  placement: "sidebar" | "tabs";
  active: boolean;
}

const comingSoon = () => toast(strings.common.comingSoon, { id: "coming-soon" });

/** Caps rows of the menu, as in the original. */
const ROW = "text-button leading-4 text-body uppercase";

/**
 * The MORE entry: Duolingo English Test and Podcast (coming soon), Settings, Help and Log out.
 * Like the original it opens while a mouse hovers it and ignores mouse clicks; taps and the keyboard
 * still work.
 */
export function MoreMenu({ placement, active }: MoreMenuProps) {
  const inSidebar = placement === "sidebar";
  const { logOut, pending } = useLogOut();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const hover = {
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      window.clearTimeout(closeTimer.current);
      setOpen(true);
    },
    onPointerLeave: (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      closeTimer.current = window.setTimeout(() => setOpen(false), 150);
    },
  };

  return (
    <Dropdown open={open} onOpenChange={setOpen} modal={false}>
      <DropdownTrigger
        {...hover}
        // With a mouse the menu follows the hover, so a click on MORE does nothing (as on the
        // original); touch and the keyboard still open and close it.
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") event.preventDefault();
        }}
        className={inSidebar ? sidebarItemClassName(active) : tabItemClassName(active)}
      >
        <Dots size={32} className="shrink-0" />
        <span className={inSidebar ? "sr-only lg:not-sr-only" : "sr-only"}>{strings.nav.more}</span>
      </DropdownTrigger>
      <DropdownContent
        {...hover}
        side={inSidebar ? "right" : "top"}
        align="end"
        className="w-[290px]"
      >
        <DropdownItem onSelect={comingSoon} className={`${ROW} gap-5`}>
          <DuoImage name="more-english-test" size={32} />
          {strings.nav.englishTest}
        </DropdownItem>
        <DropdownItem onSelect={comingSoon} className={`${ROW} gap-5`}>
          <DuoImage name="more-podcast" size={32} />
          {strings.nav.podcast}
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem asChild className={ROW}>
          <Link href={SETTINGS_HREF}>{strings.nav.settings}</Link>
        </DropdownItem>
        <DropdownItem onSelect={comingSoon} className={ROW}>
          {strings.nav.help}
        </DropdownItem>
        <DropdownItem disabled={pending} onSelect={logOut} className={ROW}>
          {authStrings.logOut}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
