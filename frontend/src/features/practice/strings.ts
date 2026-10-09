/** Every string shown on the Practice hub. Visual casing (caps) is applied with CSS. */
export const practiceStrings = {
  pageTitle: "Practice",
  bannerTitle: "Practice Hub",
  bannerBody: "Keep your Spanish sharp, win back hearts and race against the clock.",
  modes: "Practice modes",
  start: "Start",
  practice: {
    name: "Practice",
    description:
      "Review words and sentences from your path. Mistakes don't cost hearts, and finishing earns one back.",
  },
  timed: {
    name: "Timed practice",
    description:
      "Start with 30 seconds and gain 7 more for every correct answer. Each one is worth 1 XP.",
  },
  startLabel: (mode: string) => `Start ${mode.toLowerCase()}`,
} as const;
