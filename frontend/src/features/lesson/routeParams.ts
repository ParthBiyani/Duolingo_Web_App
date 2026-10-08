/** Parses a route segment such as "42" into a positive integer id, or null when it is not one. */
export function parseRouteId(raw: string): number | null {
  if (!/^\d{1,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}
