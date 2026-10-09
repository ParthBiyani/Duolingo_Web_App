"use client";

import { FlagES, FlagUS } from "@/components/icons";
import { Skeleton, toast } from "@/components/ui";
import { strings } from "@/content/strings";
import { useMe } from "@/lib/api";

import { settingsStrings } from "./strings";

const copy = settingsStrings.courses;
const comingSoon = () => toast(strings.common.comingSoon, { id: "coming-soon" });

/** The learner's course, and the other languages shown as "coming soon". */
export function CoursesSettings() {
  const me = useMe();
  const course = me.data?.course;

  return (
    <>
      <h1 className="text-heading text-title">{copy.title}</h1>

      <section aria-labelledby="current-course" className="mt-8">
        <h2 id="current-course" className="text-lead font-bold text-title">
          {copy.current}
        </h2>
        <div className="mt-3 flex items-center gap-4 rounded-rail border-2 border-border p-4">
          {course ? (
            <>
              {course.learning_language === "es" ? <FlagES size={44} /> : <FlagUS size={44} />}
              <div>
                <p className="font-bold text-title">{course.title}</p>
                <p className="mt-1 text-muted">{copy.fromLanguage}</p>
              </div>
            </>
          ) : (
            <div role="status" aria-label={copy.loading} className="flex items-center gap-4">
              <Skeleton className="size-11 rounded-lg" />
              <Skeleton className="h-5 w-32" />
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="more-courses" className="mt-8">
        <h2 id="more-courses" className="text-lead font-bold text-title">
          {copy.more}
        </h2>
        <p className="mt-1 text-muted">{copy.moreBody}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {settingsStrings.otherCourses.map((language) => (
            <li key={language.code}>
              <button
                type="button"
                onClick={comingSoon}
                className="flex w-full items-center gap-3 rounded-rail border-2 border-border p-3 text-left shadow-edge-border transition-[translate,box-shadow,background-color] duration-100 hover:bg-surface-hover active:translate-y-0.5 active:shadow-none"
              >
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-raised text-caps text-muted"
                >
                  {language.code}
                </span>
                <span className="min-w-0 flex-1 font-bold text-title">{language.name}</span>
                <span className="shrink-0 rounded-full bg-raised px-2.5 py-1 text-caps text-muted uppercase">
                  {copy.comingSoon}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
