import type { SampleLearner } from "@/lib/api/types";
import { formatCount } from "@/lib/format";

/** Every string on the login page and for logging out. Caps are applied with CSS. */
export const authStrings = {
  pageTitle: "Log in",
  close: "Close",
  signUp: "Sign up",
  title: "Log in",
  identifier: "Email or username",
  password: "Password",
  forgot: "Forgot?",
  logIn: "Log in",
  or: "Or",
  comingSoon: "Coming soon",

  samples: {
    title: "Sample learners",
    intro: "Pick a learner to explore the app at their stage of the course.",
    loading: "Loading the sample learners",
    loadError: "We couldn't load the sample learners.",
    retry: "Try again",
    loginFailed: "We couldn't log you in. Please try again.",
    /** Read before the learner's name: "Log in as Parth Biyani". */
    logInAs: "Log in as",
    /** e.g. "Unit 3 · 4,120 XP · 64-day streak". */
    summary: (learner: Pick<SampleLearner, "unit_number" | "xp_total" | "streak">) =>
      [
        `Unit ${learner.unit_number}`,
        `${formatCount(learner.xp_total)} XP`,
        learner.streak > 0 ? `${formatCount(learner.streak)}-day streak` : "no streak",
      ].join(" · "),
  },

  terms:
    "This is a demo: sample learners stand in for accounts, and their progress is shared by everyone who picks them.",

  logOut: "Log out",
  logOutFailed: "We couldn't log you out. Please try again.",
} as const;
