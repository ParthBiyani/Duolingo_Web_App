"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Button, toast } from "@/components/ui";
import { strings } from "@/content/strings";
import { authStrings } from "@/features/auth/strings";
import { useLogOut } from "@/features/auth/useLogOut";

import { settingsStrings } from "./strings";

const nav = settingsStrings.nav;

const ACCOUNT_LINKS = [
  { href: "/settings/preferences", label: nav.preferences },
  { href: "/settings/profile", label: nav.profile },
  { href: "/settings/notifications", label: nav.notifications },
  { href: "/settings/courses", label: nav.courses },
  { href: null, label: nav.schools },
  { href: null, label: nav.socialAccounts },
  { href: "/settings/privacy", label: nav.privacy },
] as const;

const comingSoon = () => toast(strings.common.comingSoon, { id: "coming-soon" });

const ROW =
  "flex h-10 w-full items-center rounded-xl px-[30px] text-left text-[20px] font-bold text-title transition-colors hover:bg-surface-hover";

/**
 * Settings navigation cards: account pages, subscription and support, then LOG OUT. In the right
 * rail from 1160px, below the content on smaller screens (two columns on tablets).
 */
export function SettingsNav() {
  const pathname = usePathname();
  const { logOut, pending } = useLogOut();

  return (
    <nav aria-label={nav.label} className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
      <NavCard title={nav.account} className="md:row-span-2 xl:row-span-1">
        <ul className="flex flex-col gap-1">
          {ACCOUNT_LINKS.map((link) => (
            <li key={link.label}>
              {link.href === null ? (
                <button type="button" onClick={comingSoon} className={ROW}>
                  {link.label}
                </button>
              ) : (
                <Link
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className={ROW}
                >
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </NavCard>
      <NavCard title={nav.subscription}>
        <button type="button" onClick={comingSoon} className={ROW}>
          {nav.choosePlan}
        </button>
      </NavCard>
      <NavCard title={nav.support}>
        <button type="button" onClick={comingSoon} className={ROW}>
          {nav.helpCenter}
        </button>
      </NavCard>
      <Button
        variant="outline"
        fullWidth
        loading={pending}
        onClick={logOut}
        className="h-12 text-blue md:col-span-2 xl:col-span-1"
      >
        {authStrings.logOut}
      </Button>
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
    <section className={`rounded-rail border-2 border-border px-4 py-6 ${className}`}>
      <h2 className="mb-4 px-[30px] text-[24px] leading-8 font-bold text-body">{title}</h2>
      {children}
    </section>
  );
}
