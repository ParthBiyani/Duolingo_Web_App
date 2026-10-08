/** Joins truthy class names (a tiny local `clsx`). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
