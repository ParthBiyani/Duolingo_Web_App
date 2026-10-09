/** Every string shown on the Profile page. Visual casing (caps) is applied with CSS. */
export const profileStrings = {
  editProfile: "Edit profile",
  username: (username: string) => username,
  joined: (monthYear: string) => `Joined ${monthYear}`,
  following: (count: number) => `${count} Following`,
  followers: (count: number) => `${count} Followers`,
  learning: (course: string) => `Learning ${course}`,

  statistics: "Statistics",
  dayStreak: "Day streak",
  totalXp: "Total XP",
  currentLeague: "Current league",
  noLeague: "None yet",
  top3: "Top 3 finishes",

  achievements: "Achievements",
  level: (level: number) => `Level ${level}`,
  progress: (progress: string, target: string) => `${progress}/${target}`,
  maxLevel: "Max level reached",
  achievementLabel: (name: string, level: number, max: number) =>
    `${name}, level ${level} of ${max}`,

  loading: "Loading your profile",
  loadErrorTitle: "We couldn't load your profile",
  loadErrorBody: "Check your connection and give it another go.",
  retry: "Try again",
} as const;
