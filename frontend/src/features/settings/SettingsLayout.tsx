import type { ReactNode } from "react";

import { SettingsNav } from "./SettingsNav";

/**
 * The settings page. From 1160px the navigation cards take the right rail's place (see
 * RightRail), as on the original; below that they follow the content.
 */
export function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pt-6 pb-16">
      <div className="min-w-0">{children}</div>
      <div className="mt-12 xl:hidden">
        <SettingsNav />
      </div>
    </div>
  );
}

/** A group of settings rows under an underlined heading. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const id = `settings-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="mt-12">
      <div className="border-b-2 border-border pb-2">
        <h2 id={id} className="text-[24px] leading-8 font-bold text-body">
          {title}
        </h2>
      </div>
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
  );
}
