/** Every string shown in the Streak modal. Visual casing (caps) is applied with CSS. */
export const streakStrings = {
  title: "Streak",
  close: "Close",
  tabs: { personal: "Personal", friends: "Friends" },

  heroTitle: (days: number) => `${days.toLocaleString("en-US")} day streak`,
  extended: "You extended your streak today. Keep it up tomorrow!",
  pending: "You haven't extended your streak today. Do a lesson to keep it going!",
  start: "Do a lesson today to start a new streak!",

  calendar: "Calendar",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  /** Single letters, Monday first, as on the original. */
  weekdays: ["M", "T", "W", "T", "F", "S", "S"],
  weekdayNames: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  dayStatus: {
    extended: "streak extended",
    frozen: "streak frozen",
    missed: "no streak",
    pending: "today",
    future: "upcoming",
  },
  loadError: "We couldn't load your streak calendar.",

  goal: "Streak Goal",
  goalProgress: (current: number, target: number) =>
    `${current.toLocaleString("en-US")} of ${target.toLocaleString("en-US")} days`,

  society: "Streak Society",
  societyLocked: "Reach a 7 day streak to join the Streak Society and earn exclusive rewards.",
  societyMember: "You're a member of the Streak Society! Exclusive rewards are coming soon.",

  friendTitle: "Friend Streaks",
  friendBody: "0 active Friend Streaks",
  friendSoon: "Friend Streaks are coming soon.",
} as const;
