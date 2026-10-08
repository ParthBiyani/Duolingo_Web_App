import type { ReactNode } from "react";

import { SettingsNav } from "./SettingsNav";

/** Two columns from 1024px (page + navigation cards); stacked on phones and tablets. */
export function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pt-6 pb-16 lg:grid lg:grid-cols-[minmax(0,1fr)_12.5rem] lg:items-start lg:gap-6">
      <div className="min-w-0">{children}</div>
      <SettingsNav />
    </div>
  );
}

/** Bordered group of settings rows with a heading. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const id = `settings-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-lead font-bold text-title">
        {title}
      </h2>
      <div className="mt-3 divide-y-2 divide-border rounded-rail border-2 border-border">
        {children}
      </div>
    </section>
  );
}
