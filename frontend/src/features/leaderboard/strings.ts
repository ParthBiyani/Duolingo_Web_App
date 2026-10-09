/** Every string shown on the Leaderboards page. Visual casing (caps) is applied with CSS. */
export const leaderboardStrings = {
  leagueTitle: (name: string) => `${name} League`,
  advance: (count: number) => `Top ${count} advance to the next league`,
  topLeague: "You are in the top league. Finish in the top 3 to earn gems!",
  timeLeftLabel: "Time left this week",
  tierBadge: (name: string, state: "past" | "current" | "locked") =>
    state === "current"
      ? `${name} League, your league`
      : state === "locked"
        ? `${name} League, locked`
        : `${name} League`,
  promotionZone: "Promotion zone",
  demotionZone: "Demotion zone",
  xp: (xp: string) => `${xp} XP`,
  rank: (rank: number, zone: "promotion" | "safe" | "demotion") =>
    zone === "promotion"
      ? `Rank ${rank}, promotion zone`
      : zone === "demotion"
        ? `Rank ${rank}, demotion zone`
        : `Rank ${rank}`,
  you: "(you)",

  lockedTitle: "Unlock Leaderboards!",
  lockedBody: (lessons: number) =>
    `Complete ${lessons} more ${lessons === 1 ? "lesson" : "lessons"} to start competing`,
  lockedCta: "Start a lesson",

  result: {
    promoted: (league: string) => `You've been promoted to the ${league} League!`,
    stayed: (league: string) => `You held your place in the ${league} League`,
    demoted: (league: string) => `You moved down to the ${league} League`,
    rank: (rank: number) => `You finished #${rank} last week.`,
    gems: (gems: number) => `You earned ${gems} gems for a top 3 finish.`,
    keepGoing: "A new week has started. Earn XP to climb the table!",
    cta: "Continue",
  },

  loading: "Loading the leaderboard",
  loadErrorTitle: "We couldn't load the leaderboard",
  loadErrorBody: "Check your connection and give it another go.",
  retry: "Try again",
} as const;
