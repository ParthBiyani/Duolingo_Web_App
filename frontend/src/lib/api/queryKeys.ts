/** One cache key per endpoint, so mutations can patch or invalidate precisely. */
export const queryKeys = {
  sampleLearners: ["auth", "learners"] as const,
  me: ["me"] as const,
  path: ["path"] as const,
  quests: ["quests"] as const,
  shop: ["shop"] as const,
  leaderboard: ["leaderboard"] as const,
  profile: ["profile"] as const,
  session: (id: string) => ["session", id] as const,
  demoClock: ["demo", "clock"] as const,
};
