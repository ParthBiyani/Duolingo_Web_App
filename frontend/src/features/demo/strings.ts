/** Strings for the Demo tools panel (a reviewer aid for simulated time, not a product screen). */
export const demoStrings = {
  title: "Demo tools",
  badge: "For reviewers",
  description:
    "Move the simulated clock forward to test hearts, streaks, daily goals and the weekly league reset.",
  serverTime: "Server time",
  offset: "Clock offset",
  noOffset: "Real time",
  timeZone: (zone: string) => `Learner time zone: ${zone}`,

  actions: {
    hour: "+1 hour",
    fiveHours: "+5 hours",
    day: "+1 day",
    nextMonday: "Next Monday",
  },
  advanced: (label: string) => `Clock moved: ${label}`,
  advanceFailed: "The clock couldn't be moved. Is the demo mode enabled on the server?",

  reset: "Reset demo data",
  resetTitle: "Reset demo data?",
  resetBody:
    "This puts the sample learner's progress, gems, hearts, streak and league back to their starting state and resets the clock.",
  resetConfirm: "Reset",
  resetCancel: "Cancel",
  resetDone: "Demo data reset",
  resetFailed: "The reset didn't go through. Please try again.",
  unavailable: "Demo mode is turned off on the server.",
} as const;
