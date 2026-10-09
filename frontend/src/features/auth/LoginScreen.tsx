"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Close } from "@/components/icons";
import { Button, Skeleton, toast } from "@/components/ui";
import { useLogin, useSampleLearners, type SampleLearner } from "@/lib/api";
import { HOME_PATH } from "@/lib/auth";

import { authStrings } from "./strings";

const comingSoon = () => toast(authStrings.comingSoon, { id: "coming-soon" });

const INPUT =
  "h-[3.25rem] short:h-12 shorter:h-11 w-full rounded-button border-2 border-border bg-raised px-4 text-base text-body outline-none placeholder:text-disabled focus:border-selected-border";

/**
 * The login page, laid out like Duolingo's: a close button and SIGN UP at the top, the
 * email-and-password form, then the sample learners. The form and sign-up are placeholders
 * ("Coming soon"); picking a sample learner logs in as them (docs/adr/0003).
 */
export function LoginScreen() {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 short:py-2 shorter:py-1">
        <Link
          href="/"
          aria-label={authStrings.close}
          className="grid size-10 place-items-center rounded-full hover:bg-surface-hover"
        >
          <Close size={22} />
        </Link>
        <Button variant="outline" size="sm" onClick={comingSoon}>
          {authStrings.signUp}
        </Button>
      </header>

      <main className="mx-auto w-full max-w-[23.5rem] px-4 pb-4 md:pt-4 short:md:pt-0">
        <h1 className="text-center text-heading text-title shorter:text-[1.375rem]">
          {authStrings.title}
        </h1>
        <CredentialsForm />

        <div className="my-4 flex items-center gap-4 short:my-2.5 shorter:my-2" aria-hidden="true">
          <span className="h-0.5 flex-1 bg-border" />
          <span className="text-caps text-disabled uppercase">{authStrings.or}</span>
          <span className="h-0.5 flex-1 bg-border" />
        </div>

        <SampleLearners />

        <p className="mt-4 text-center text-xs text-muted short:mt-2">{authStrings.terms}</p>
      </main>
    </div>
  );
}

/** Email and password, as on the real page; submitting shows "Coming soon". */
function CredentialsForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const filled = identifier.trim() !== "" && password !== "";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    comingSoon();
  };

  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-3 short:mt-2 short:gap-2" noValidate>
      <input
        type="text"
        name="identifier"
        autoComplete="username"
        aria-label={authStrings.identifier}
        placeholder={authStrings.identifier}
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        className={INPUT}
      />
      <div className="relative">
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          aria-label={authStrings.password}
          placeholder={authStrings.password}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={`${INPUT} pr-24`}
        />
        <button
          type="button"
          onClick={comingSoon}
          className="absolute inset-y-0 right-4 my-auto h-fit text-caps text-disabled uppercase hover:text-muted"
        >
          {authStrings.forgot}
        </button>
      </div>
      {/* Looks disabled until both fields are filled, like the real button. */}
      <Button type="submit" variant={filled ? "secondary" : "locked"} fullWidth>
        {authStrings.logIn}
      </Button>
    </form>
  );
}

/** One card per sample learner; a click logs in as them and opens the learning path. */
function SampleLearners() {
  const router = useRouter();
  const learners = useSampleLearners();
  const login = useLogin();
  const chosen = login.isPending || login.isSuccess ? login.variables?.username : undefined;

  const logIn = (learner: SampleLearner) => {
    if (chosen) return;
    login.mutate(
      { username: learner.username },
      {
        onSuccess: () => router.replace(HOME_PATH),
        onError: () => toast.error(authStrings.samples.loginFailed, { id: "log-in" }),
      },
    );
  };

  return (
    <section aria-labelledby="sample-learners">
      <h2 id="sample-learners" className="text-center text-lead font-bold text-title">
        {authStrings.samples.title}
      </h2>
      <p className="mt-0.5 text-center text-sm text-body shorter:hidden">
        {authStrings.samples.intro}
      </p>

      {learners.isPending ? (
        <ul className="mt-3 grid grid-cols-2 gap-3" aria-label={authStrings.samples.loading}>
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <Skeleton className="block h-[6.5rem] w-full rounded-rail" />
            </li>
          ))}
        </ul>
      ) : learners.isError ? (
        <div className="mt-4 flex flex-col items-center gap-3 text-center">
          <p className="text-body">{authStrings.samples.loadError}</p>
          <Button variant="outline" size="sm" onClick={() => void learners.refetch()}>
            {authStrings.samples.retry}
          </Button>
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 shorter:mt-2 shorter:gap-2">
          {learners.data.map((learner) => (
            <li key={learner.username}>
              <LearnerCard
                learner={learner}
                busy={chosen === learner.username}
                disabled={chosen !== undefined}
                onSelect={() => logIn(learner)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LearnerCard({
  learner,
  busy,
  disabled,
  onSelect,
}: {
  learner: SampleLearner;
  busy: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-busy={busy || undefined}
      className="flex h-full w-full flex-col gap-2 rounded-rail border-2 border-b-4 border-border p-3 text-left transition-colors not-disabled:hover:bg-surface-hover not-disabled:active:translate-y-0.5 not-disabled:active:border-b-2 disabled:cursor-default aria-busy:border-selected-border aria-busy:bg-selected-bg short:py-2 [&:disabled:not([aria-busy])]:opacity-50"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: learner.avatar_color }}
        >
          {learner.initials}
        </span>
        <span className="min-w-0 flex-1 text-[15px] leading-tight font-bold text-title">
          <span className="sr-only">{authStrings.samples.logInAs}</span> {learner.display_name}
        </span>
      </span>
      <SummaryLines summary={authStrings.samples.summary(learner)} />
    </button>
  );
}

/** The unit on its own line, then XP and streak; the separator stays for screen readers. */
function SummaryLines({ summary }: { summary: string }) {
  const [unit, ...rest] = summary.split(" · ");
  return (
    <span className="text-[13px] leading-snug text-body">
      <span className="block font-bold text-muted">{unit}</span>
      <span className="sr-only"> · </span>
      <span className="block">{rest.join(" · ")}</span>
    </span>
  );
}
