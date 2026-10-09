/**
 * Every string shown in the lesson player and its celebration screens.
 * Visual casing (caps) is applied with CSS, so labels are written in sentence case.
 */
export const lessonStrings = {
  // Header
  quitLabel: "Quit lesson",
  progressLabel: "Lesson progress",
  heartsLabel: (hearts: number) => `${hearts} ${hearts === 1 ? "heart" : "hearts"} left`,
  mistakesLabel: (left: number) => `${left} ${left === 1 ? "mistake" : "mistakes"} left`,
  combo: (count: number) => `${count} in a row`,
  timeLeftLabel: (seconds: number) => `${seconds} seconds left`,

  // Exercise badges
  newWord: "New word",
  previousMistake: "Previous mistake",

  // Footer
  check: "Check",
  skip: "Skip",
  continue: "Continue",

  // Feedback bar
  praise: [
    "Nice!",
    "Great job!",
    "Nicely done!",
    "You nailed it!",
    "Spot on!",
    "Brilliant!",
    "Way to go!",
    "Fantastic!",
    "Right on!",
    "Excellent!",
  ],
  typoNote: "Almost perfect! Mind the spelling:",
  correctSolution: "Correct solution:",
  comeBackLater: "We'll come back to this one.",
  tooEasy: "Too easy",
  tooHard: "Too difficult",
  report: "Report",
  feedbackThanks: "Thanks for the feedback!",

  // Exercises
  typeIn: { en: "Type in English", es: "Type in Spanish" },
  answerLabel: "Your answer",
  wordBankLabel: "Word bank",
  playAudio: "Play audio",
  cantListen: "Can't listen now",
  cantSpeak: "Can't speak now",
  tapToSpeak: "Tap to speak",
  speakSoon: "Speech checking is on its way.",
  comingSoon: "Coming soon",
  blank: "blank",
  optionLabel: (index: number, text: string) => `${index}. ${text}`,

  // Interstitials
  motivation: [
    "You're on a roll! Keep that energy going.",
    "Look at you go! Your Spanish is growing fast.",
    "Great focus! A few more and this lesson is yours.",
  ],
  comboMessages: [
    (count: number) => `${count} in a row! You're on fire!`,
    (count: number) => `Wow, ${count} correct answers in a row!`,
    (count: number) => `${count} straight! Nothing can stop you now.`,
  ],
  review: [
    "Let's revisit the ones you missed. You've got this!",
    "Time to fix those mistakes. Practice makes progress!",
  ],

  // Quit modal
  quitTitle: "Hold on! Leaving already?",
  quitBody: "If you quit now, you'll lose the progress you've made in this lesson.",
  keepLearning: "Keep learning",
  endSession: "End session",

  // Out of hearts
  outOfHeartsTitle: "You're out of hearts!",
  outOfHeartsBody: "Refill your hearts to keep going, or practice to earn one back.",
  unlimitedHearts: "Unlimited hearts",
  unlimitedGlyph: "∞",
  refillHearts: "Refill hearts",
  refillPrice: 450,
  needGems: (missing: number) => `You need ${missing} more ${missing === 1 ? "gem" : "gems"}`,
  practiceForHearts: "Practice to earn hearts",
  practiceForHeartsNote: "Pass a quick practice to win a heart back",
  noThanks: "No thanks",
  refilled: "Hearts refilled! Back to it.",
  refillFailed: "We couldn't refill your hearts. Please try again.",
  notEnoughGems: "You don't have enough gems for a refill yet.",

  // Loading and errors
  loading: "Getting your lesson ready",
  loadingCaption: "Loading...",
  loadingFacts: [
    "Spanish is the official language of 20 countries.",
    "Learning a few minutes every day beats one long session a week.",
    "Saying new words out loud helps you remember them.",
    "Spanish has two verbs for “to be”: ser and estar.",
    "The letter ñ is only one of the sounds English doesn't have.",
    "Mistakes are part of learning: missed exercises come back at the end.",
  ],
  loadErrorTitle: "We couldn't start this lesson",
  loadErrorBody: "Check your connection and give it another go.",
  completeErrorTitle: "We couldn't save your results",
  completeErrorBody: "Your answers are safe. Let's try saving them again.",
  retry: "Try again",
  backToPath: "Back to path",
  submitFailed: "We couldn't check that answer. Please try again.",
  saving: "Saving your progress",
  startErrors: {
    skill_locked: "This level is still locked. Finish the ones before it first!",
    insufficient_gems: "You need more gems to unlock this challenge.",
    nothing_to_practice: "Nothing to practice yet. Finish a lesson first!",
  } as Record<string, string>,

  // Lesson complete
  completeTitle: {
    lesson: "Lesson complete!",
    review: "Review complete!",
    practice: "Practice complete!",
    legendary: "Legendary complete!",
    timed: "Time's up!",
  },
  totalXp: "Total XP",
  accuracy: { amazing: "Amazing", great: "Great", good: "Good" },
  timeCard: "Time",
  reviewLesson: "Review lesson",
  reviewLessonSoon: "Lesson review is coming soon!",
  heartsEarned: (hearts: number) => `+${hearts} ${hearts === 1 ? "heart" : "hearts"}`,

  // Streak
  dayStreak: "day streak",
  streakBody: (days: number) =>
    days === 1
      ? "You started a streak! Come back tomorrow to keep the fire burning."
      : `That's ${days} days in a row! Practice tomorrow to keep it alive.`,
  streakMilestone: (days: number) => `${days} days! That's a milestone worth celebrating.`,
  weekLabel: "This week",

  // Daily goal and chest
  goalTitle: "Daily goal complete!",
  earnXp: (xp: number) => `Earn ${xp} XP`,
  goalProgress: (done: number, goal: number) => `${done} / ${goal}`,
  chestTitle: (gems: number) => `You earned ${gems} gems!`,
  chestBody: "Your daily goal chest is open. Spend your gems in the shop!",

  // Achievement
  achievementTitle: "Achievement unlocked!",
  achievementLevel: (level: number) => `Level ${level}`,
  plusGems: (gems: number) => `+${gems} ${gems === 1 ? "gem" : "gems"}`,

  // Legendary failure
  failedTitle: "So close!",
  failedBody: "You used up all your mistakes this time. Practice a little more and try again.",
} as const;
