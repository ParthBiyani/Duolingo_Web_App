import Link from "next/link";

import { Mascot } from "@/components/mascot";
import { buttonClassName } from "@/components/ui";
import { strings } from "@/content/strings";

/** Copy for this standalone page (it renders outside the app shell and its features). */
const copy = {
  code: "Error 404",
  title: "This page flew the nest",
  body: "We looked everywhere, but the page you wanted isn't here. Let's get you back to your lessons.",
  cta: "Back to learning",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface px-4">
      <header className="mx-auto w-full max-w-5xl py-5 md:py-6">
        <Link
          href="/learn"
          aria-label={strings.brand.homeLabel}
          className="text-[32px] leading-none font-extrabold tracking-tight text-green"
        >
          {strings.brand.wordmark}
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 pb-20 text-center">
        <Mascot pose="lost" size={200} className="max-md:h-auto max-md:w-40" />
        <p className="mt-2 text-button text-muted uppercase">{copy.code}</p>
        <h1 className="text-display text-title">{copy.title}</h1>
        <p className="text-muted">{copy.body}</p>
        <Link
          href="/learn"
          className={buttonClassName({ variant: "secondary", size: "lg", className: "mt-4" })}
        >
          {copy.cta}
        </Link>
      </main>
    </div>
  );
}
