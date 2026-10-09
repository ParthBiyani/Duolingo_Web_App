/** One cache key per endpoint, so mutations can patch or invalidate precisely. */
export const queryKeys = {
  sampleLearners: ["auth", "learners"] as const,
  me: ["me"] as const,
  path: ["path"] as const,
  quests: ["quests"] as const,
  shop: ["shop"] as const,
  leaderboard: ["leaderboard"] as const,
  profile: ["profile"] as const,
  /** Prefix of every month's streak calendar, for invalidating them all at once. */
  streakCalendars: ["streak", "calendar"] as const,
  streakCalendar: (month: string | null) => ["streak", "calendar", month ?? "current"] as const,
  session: (id: string) => ["session", id] as const,
  demoClock: ["demo", "clock"] as const,
};
