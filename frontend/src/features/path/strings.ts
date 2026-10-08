/** Every string shown on the learning path. Visual casing (caps) is applied with CSS. */
export const pathStrings = {
  pageTitle: "Learn",
  sectionUnit: (section: number, unit: number) => `Section ${section}, Unit ${unit}`,
  unitHeading: (unit: number, title: string) => `Unit ${unit}: ${title}`,
  guidebook: "Guidebook",

  start: "Start",
  open: "Open",
  lessonOf: (current: number, total: number) => `Lesson ${current} of ${total}`,
  startXp: "Start +10 XP",
  reviewXp: "Review +5 XP",
  legendaryXp: "Legendary +40 XP",
  locked: "Locked",
  lockedHint: "Complete all levels above to unlock this!",
  completedHint: "Level complete! Brush up on it or go for Legendary.",
  legendaryHint: "You reached Legendary on this level. Impressive!",
  unitReviewHint: "Show what you learned across this whole unit.",
  practiceHint: "Strengthen the words and phrases you have met so far.",
  chestHint: "A reward for your progress. Open it to collect your gems!",
  chestClaimedHint: "You already opened this chest.",
  openChest: "Open chest",
  chestReward: (gems: number) => `+${gems} gems`,
  chestFailed: "That chest would not open. Please try again.",

  nodeLabel: {
    active: (title: string, current: number, total: number) =>
      `${title}, current level, lesson ${current} of ${total}`,
    activeChest: (title: string) => `${title}, ready to open`,
    completed: (title: string, crowns: number) => `${title}, completed, crown level ${crowns}`,
    completedChest: (title: string) => `${title}, opened`,
    legendary: (title: string) => `${title}, legendary`,
    locked: (title: string) => `${title}, locked`,
  },

  jumpUp: "Scroll up to your current level",
  jumpDown: "Scroll down to your current level",

  loading: "Loading your path",
  loadErrorTitle: "We couldn't load your path",
  loadErrorBody: "Check your connection and give it another go.",
  retry: "Try again",
  empty: "No lessons are available yet.",
} as const;
