import type { DailyGoal, Theme } from "@/lib/api/types";

/** Every string shown in Settings. Visual casing (caps) is applied with CSS. */
export const settingsStrings = {
  saved: "Changes saved",
  saveFailed: "We couldn't save that change. Please try again.",

  preferences: {
    title: "Preferences",
    lessonExperience: "Lesson experience",
    soundEffects: "Sound effects",
    animations: "Animations",
    motivationalMessages: "Motivational messages",
    listeningExercises: "Listening exercises",
    appearance: "Appearance",
    darkMode: "Dark mode",
    learning: "Learning",
    dailyGoal: "Daily goal",
    loading: "Loading your preferences",
  },

  themeOptions: [
    { value: "system", label: "System default" },
    { value: "dark", label: "On" },
    { value: "light", label: "Off" },
  ] satisfies { value: Theme; label: string }[],

  goalOptions: [
    { value: 1, label: "Basic (1 XP)" },
    { value: 10, label: "Casual (10 XP)" },
    { value: 20, label: "Regular (20 XP)" },
    { value: 30, label: "Serious (30 XP)" },
    { value: 50, label: "Intense (50 XP)" },
  ] satisfies { value: DailyGoal; label: string }[],

  nav: {
    label: "Settings",
    account: "Account",
    preferences: "Preferences",
    profile: "Profile",
    notifications: "Notifications",
    courses: "Courses",
    schools: "Duolingo for Schools",
    socialAccounts: "Social accounts",
    privacy: "Privacy settings",
    subscription: "Subscription",
    choosePlan: "Choose a plan",
    support: "Support",
    helpCenter: "Help Center",
  },

  placeholders: {
    profile: {
      title: "Profile",
      body: "Soon you'll be able to change your name, username and photo here.",
    },
    notifications: {
      title: "Notifications",
      body: "Reminders and email preferences are on their way.",
    },
    privacy: {
      title: "Privacy settings",
      body: "Controls for your public profile and your data are coming soon.",
    },
  },

  courses: {
    title: "Courses",
    current: "Current course",
    fromLanguage: "From English",
    more: "More courses",
    moreBody: "New languages are on their way. They'll appear here when they're ready.",
    comingSoon: "Coming soon",
    loading: "Loading your courses",
  },

  otherCourses: [
    { name: "French", code: "FR" },
    { name: "German", code: "DE" },
    { name: "Japanese", code: "JA" },
    { name: "Italian", code: "IT" },
    { name: "Korean", code: "KO" },
    { name: "Portuguese", code: "PT" },
    { name: "Chinese", code: "ZH" },
    { name: "Hindi", code: "HI" },
  ],

  loadErrorTitle: "We couldn't load your settings",
  loadErrorBody: "Check your connection and give it another go.",
  retry: "Try again",
} as const;
