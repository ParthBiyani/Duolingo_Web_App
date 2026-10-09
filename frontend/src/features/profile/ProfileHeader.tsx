import { FlagES } from "@/components/icons";
import { toast } from "@/components/ui";
import { strings } from "@/content/strings";
import type { ProfileResponse } from "@/lib/api/types";

import { profileStrings } from "./strings";

const comingSoon = () => toast(strings.common.comingSoon, { id: "coming-soon" });

/** "August 2026" in the learner's own time zone. */
export function joinedLabel(joinedAt: string, timeZone: string): string {
  const date = new Date(joinedAt);
  try {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone }).format(
      date,
    );
  } catch {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
  }
}

/** "Parth Biyani" -> "PB"; a single name gives one letter. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

/** Light-blue avatar banner, then name, handle, join date, friends and the course flag. */
export function ProfileHeader({ user, course }: Pick<ProfileResponse, "user" | "course">) {
  return (
    <header className="border-b-2 border-border pb-6">
      <div className="relative grid h-52 place-items-center rounded-rail bg-selected-bg">
        <span
          aria-hidden="true"
          className="grid size-32 place-items-center rounded-full border-4 border-surface text-5xl font-extrabold text-white"
          style={{ backgroundColor: user.avatar_color }}
        >
          {initials(user.display_name)}
        </span>
        <button
          type="button"
          onClick={comingSoon}
          aria-label={profileStrings.editProfile}
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-button border-2 border-border bg-surface text-blue shadow-edge-border transition-[translate,box-shadow] duration-100 hover:bg-surface-hover active:translate-y-0.5 active:shadow-none"
        >
          <PencilGlyph />
        </button>
      </div>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-[26px] leading-8 font-bold text-title">
            {user.display_name}
          </h1>
          <p className="mt-1 text-muted">{profileStrings.username(user.username)}</p>
          <p className="mt-3 text-muted">
            {profileStrings.joined(joinedLabel(user.joined_at, user.timezone))}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            <button
              type="button"
              onClick={comingSoon}
              className="font-bold text-blue hover:underline"
            >
              {profileStrings.following(0)}
            </button>
            <button
              type="button"
              onClick={comingSoon}
              className="font-bold text-blue hover:underline"
            >
              {profileStrings.followers(0)}
            </button>
          </div>
        </div>
        <FlagES size={44} title={profileStrings.learning(course.title)} className="shrink-0" />
      </div>
    </header>
  );
}

/** Pencil drawn for the edit button (the shared icon set has no pencil). */
function PencilGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
