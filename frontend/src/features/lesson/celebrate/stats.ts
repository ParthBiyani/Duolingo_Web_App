export type AccuracyTier = "amazing" | "great" | "good";

/** Label for the accuracy card: AMAZING from 95%, GREAT from 80%, otherwise GOOD. */
export function accuracyTier(accuracyPct: number): AccuracyTier {
  if (accuracyPct >= 95) return "amazing";
  if (accuracyPct >= 80) return "great";
  return "good";
}

/** Whole-number percentage clamped to 0..100. */
export function formatPercent(accuracyPct: number): string {
  return `${Math.round(Math.min(100, Math.max(0, accuracyPct)))}%`;
}

/** Seconds as m:ss (e.g. 125 -> "2:05"). */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
