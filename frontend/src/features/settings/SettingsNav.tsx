"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { toast } from "@/components/ui";
import { strings } from "@/content/strings";

import { settingsStrings } from "./strings";

const nav = settingsStrings.nav;

const ACCOUNT_LINKS = [
  { href: "/settings/preferences", label: nav.preferences },
  { href: "/settings/profile", label: nav.profile },
  { href: "/settings/notifications", label: nav.notifications },
  { href: "/settings/courses", label: nav.courses },
  { href: "/settings/privacy", label: nav.privacy },
] as const;

const comingSoon = () => toast(strings.common.comingSoon, { id: "coming-soon" });

const ROW =
  "flex w-full items-center rounded-card px-3 py-2.5 text-left font-bold transition-colors";

/**
 * Settings navigation cards: account pages, subscription and support. Beside the content from
 * 1024px, below it on smaller screens (two columns on tablets).
 */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label={nav.label} className="mt-10 grid gap-4 md:grid-cols-2 lg:mt-0 lg:grid-cols-1">
      <NavCard title={nav.account} className="md:row-span-2 lg:row-span-1">
        <ul>
          {ACCOUNT_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`${ROW} ${active ? "bg-selected-bg text-selected-text" : "text-body hover:bg-surface-hover"}`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </NavCard>
      <NavCard title={nav.subscription}>
        <button
          type="button"
          onClick={comingSoon}
          className={`${ROW} text-body hover:bg-surface-hover`}
        >
          {nav.choosePlan}
        </button>
      </NavCard>
      <NavCard title={nav.support}>
        <button
          type="button"
          onClick={comingSoon}
          className={`${ROW} text-body hover:bg-surface-hover`}
        >
          {nav.helpCenter}
        </button>
      </NavCard>
    </nav>
  );
}

function NavCard({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-rail border-2 border-border p-3 ${className}`}>
      <h2 className="px-3 pt-1 pb-2 text-lead font-bold text-title">{title}</h2>
      {children}
    </section>
  );
}
