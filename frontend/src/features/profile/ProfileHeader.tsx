import { DuoImage, FlagES } from "@/components/icons";
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
      <div className="relative h-56 overflow-hidden rounded-[15px] bg-selected-bg dark:bg-raised">
        {/* No photo yet: the dashed "add an avatar" silhouette, as for any new learner. */}
        <DuoImage
          name="avatar-empty"
          size={166}
          title={initials(user.display_name)}
          className="absolute top-[39px] left-1/2 -translate-x-1/2"
        />
        <button
          type="button"
          onClick={comingSoon}
          aria-label={profileStrings.editProfile}
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-button border-2 border-border bg-surface text-blue shadow-edge-border transition-[translate,box-shadow] duration-100 hover:bg-surface-hover active:translate-y-0.5 active:shadow-none"
        >
          <PencilGlyph />
        </button>
      </div>

      <div className="mt-7 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-[28px] leading-[34px] font-bold text-title">
            {user.display_name}
          </h1>
          <p className="leading-5 text-muted">{profileStrings.username(user.username)}</p>
          <p className="mt-1.5 leading-5 text-muted dark:text-body">
            {profileStrings.joined(joinedLabel(user.joined_at, user.timezone))}
          </p>
          <div className="mt-3.5 flex flex-wrap gap-x-[22px] gap-y-1">
            <button
              type="button"
              onClick={comingSoon}
              className="text-[16px] leading-[19px] font-bold text-blue hover:underline"
            >
              {profileStrings.following(0)}
            </button>
            <button
              type="button"
              onClick={comingSoon}
              className="text-[16px] leading-[19px] font-bold text-blue hover:underline"
            >
              {profileStrings.followers(0)}
            </button>
          </div>
        </div>
        <FlagES
          size={31}
          title={profileStrings.learning(course.title)}
          className="mb-0.5 shrink-0"
        />
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
