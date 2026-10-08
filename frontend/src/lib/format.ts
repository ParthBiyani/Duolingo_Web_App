/** Formats a whole number with thousands separators, e.g. 1240 -> "1,240". */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
