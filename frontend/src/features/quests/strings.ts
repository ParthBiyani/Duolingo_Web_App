/** Every string shown on the Quests page. Visual casing (caps) is applied with CSS. */
export const questsStrings = {
  pageTitle: "Quests",
  bannerTitle: "Welcome!",
  bannerBody: "Complete quests to earn rewards! Quests refresh every day.",
  dailyQuests: "Daily Quests",
  timeLeft: (left: string) => left,
  progress: (progress: number, target: number) => `${progress} / ${target}`,
  progressLabel: (title: string, progress: number, target: number) =>
    `${title}: ${progress} of ${target}`,
  completed: "Completed",
  reward: (gems: number) => `Reward: ${gems} gems`,
  moreSoonTitle: "More quests unlock soon",
  moreSoonBody: "Keep learning to unlock new kinds of quests.",
  empty: "No quests today. Check back tomorrow!",

  loading: "Loading your quests",
  loadErrorTitle: "We couldn't load your quests",
  loadErrorBody: "Check your connection and give it another go.",
  retry: "Try again",
} as const;
