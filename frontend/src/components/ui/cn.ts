export type ClassValue = string | false | null | undefined;

/**
 * Joins class names, skipping falsy parts. Primitive skins live in the CSS
 * `components` layer, so a utility passed by a caller always wins over them
 * and no class-merging logic is needed here.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
