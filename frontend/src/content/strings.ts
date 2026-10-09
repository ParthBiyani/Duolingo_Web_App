/**
 * Shared UI copy for the app shell and common states. Feature folders keep
 * their own `strings.ts`. Labels shown in caps are written in sentence case
 * here and upper-cased with CSS, so screen readers read them naturally.
 */

const plural = (count: number, one: string, many: string) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

export const strings = {
  brand: {
    wordmark: "duolingo",
    homeLabel: "Duolingo home",
  },

  common: {
    comingSoon: "Coming soon",
    retry: "Retry",
    loading: "Loading",
    close: "Close",
    dismiss: "Dismiss",
    viewAll: "View all",
    skipToContent: "Skip to main content",
  },

  errors: {
    generic: "Something went wrong. Please try again.",
    network: "Can't reach the server. Check your connection and try again.",
    refreshFailed: "We couldn't refresh your data.",
  },

  nav: {
    label: "Main",
    learn: "Learn",
    practice: "Practice",
    leaderboards: "Leaderboards",
    quests: "Quests",
    shop: "Shop",
    profile: "Profile",
    more: "More",
    settings: "Settings",
    help: "Help",
  },

  stats: {
    label: "Your stats",
    course: {
      trigger: (course: string) => `Course: ${course}`,
      heading: "My courses",
      addCourse: "Add a new course",
    },
    streak: {
      trigger: (days: number) => `Streak: ${plural(days, "day", "days")}`,
      title: (days: number) => `${days.toLocaleString("en-US")} day streak`,
      extended: "You extended your streak today. Nice work!",
      pending: "Do a lesson today to extend your streak!",
      start: "Do a lesson today to start a new streak!",
      freezes: (count: number) => `${plural(count, "streak freeze", "streak freezes")} equipped`,
      friendTitle: "Friend Streaks",
      friendBody: "0 active Friend Streaks",
      viewList: "View list",
      societyTitle: "Streak Society",
      societyBody: "Reach a 7 day streak to join the Streak Society and earn exclusive rewards.",
      dayStatus: {
        extended: "streak extended",
        frozen: "streak frozen",
        missed: "missed",
        pending: "today",
        future: "upcoming",
      },
    },
    xp: {
      trigger: (xp: number) => `Total XP: ${xp.toLocaleString("en-US")}`,
      title: (xp: number) => `${xp.toLocaleString("en-US")} XP`,
      total: "Total experience earned",
      dailyGoal: "Daily goal",
      progress: (today: number, goal: number) => `${today} / ${goal} XP`,
      progressLabel: (today: number, goal: number) => `Daily goal: ${today} of ${goal} XP`,
      remaining: (left: number) => `Earn ${left} more XP to reach today's goal.`,
      reached: "You reached today's goal. Nice work!",
      changeGoal: "Change daily goal",
    },
    gems: {
      trigger: (gems: number) => `Gems: ${gems.toLocaleString("en-US")}`,
      title: "Gems",
      balance: (gems: number) => `You have ${plural(gems, "gem", "gems")}`,
      shop: "Go to shop",
    },
    hearts: {
      trigger: (hearts: number) => `Hearts: ${hearts}`,
      title: "Hearts",
      full: "You have full hearts",
      fullHint: "Keep on learning",
      partialHint: "You still have hearts left! Keep on learning",
      emptyHint: "Refill your hearts or practice to earn one back.",
      freeTrial: "Free trial",
      nextHeart: "Next heart in",
      empty: "You ran out of hearts",
      unlimited: "Unlimited hearts",
      refill: "Refill hearts",
      refilled: "Hearts refilled!",
      notEnoughGems: "You don't have enough gems",
      alreadyFull: "Your hearts are already full",
      practice: "Practice to earn hearts",
    },
  },

  rail: {
    label: "Progress and offers",
    super: {
      badge: "Super",
      title: "Try Super for free",
      body: "No ads, personalized practice, and unlimited Legendary!",
      cta: "Try 1 week free",
    },
    league: {
      title: (name: string) => `${name} League`,
      view: "View league",
      rank: (rank: number) => `You're ranked #${rank}`,
      rankPending: "Complete a lesson to join this week's league",
      xp: (xp: number) => `You've earned ${plural(xp, "XP", "XP")} this week`,
      lockedTitle: "Unlock Leaderboards!",
      locked: (lessons: number) =>
        `Complete ${plural(lessons, "more lesson", "more lessons")} to start competing`,
      lockedUnknown: "Complete more lessons to start competing",
    },
    quests: {
      title: "Daily Quests",
      progress: (progress: number, target: number) => `${progress} / ${target}`,
      empty: "New quests arrive tomorrow.",
    },
    monthly: {
      title: "Monthly challenges unlock soon!",
      body: "Complete each month’s challenge to earn exclusive badges",
      cta: "Start a lesson",
    },
    friends: {
      following: "Following",
      followers: "Followers",
      body: "Learning is more fun and effective when you connect with others.",
      addTitle: "Add friends",
      find: "Find friends",
      invite: "Invite friends",
    },
    footer: {
      label: "Footer",
      links: ["About", "Blog", "Store", "Efficacy", "Careers", "Investors", "Terms", "Privacy"],
      disclaimer: "Educational clone built for a hiring assignment; not affiliated with Duolingo.",
    },
  },

  time: {
    days: (count: number) => plural(count, "day", "days"),
    hours: (count: number) => plural(count, "hour", "hours"),
    minutes: (count: number) => plural(count, "minute", "minutes"),
  },
} as const;
