import type { IconProps } from "./IconBase";

/** Artwork files served from /public/duo, named after what they show. */
export type DuoAsset =
  | "logo"
  | "nav-learn"
  | "nav-leaderboards"
  | "nav-quests"
  | "nav-shop"
  | "nav-more"
  | "flag-es"
  | "streak"
  | "streak-off"
  | "streak-freeze"
  | "gem"
  | "heart"
  | "heart-empty"
  | "heart-refill"
  | "heart-unlimited"
  | "quest-bolt"
  | "quest-chest"
  | "super-logo"
  | "super-owl"
  | "banner-back"
  | "guidebook"
  | "node-star"
  | "node-star-locked"
  | "node-check"
  | "node-trophy"
  | "node-trophy-locked"
  | "node-dumbbell-locked"
  | "chest"
  | "chest-locked"
  | "chest-locked-light"
  | "chest-open"
  | "stat-streak"
  | "stat-xp"
  | "stat-medal"
  | "friends"
  | "find-friends"
  | "invite-friends"
  | "league-locked"
  | "leagues-unlock"
  | "leagues-locked-hero"
  | "streak-calendar-flame"
  | "streak-day-check"
  | "friend-streaks"
  | "streak-society-locked"
  | "avatar-empty"
  | "monthly-challenge"
  | "quests-hero"
  | "quests-locked"
  | `league-${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;

interface DuoImageProps extends IconProps {
  name: DuoAsset;
}

/**
 * One piece of the original artwork. `size` is the rendered width; the height follows the
 * file's own proportions. Decorative unless a `title` is given.
 */
export function DuoImage({ name, size = 24, className, title }: DuoImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static SVGs, no optimisation needed
    <img
      src={`/duo/${name}.svg`}
      width={size}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      draggable={false}
      className={className}
      style={{ height: "auto" }}
    />
  );
}
