import type { Locator } from "@playwright/test";

import { expect, test } from "./support/fixtures";
import { LessonPage, startActiveLesson } from "./support/lesson";
import { exerciseType, type ExerciseType } from "./support/oracle";

/** What each exercise type puts on screen, checked before it is answered. */
const LOOKS_LIKE: Record<ExerciseType, (exercise: Locator) => Promise<void>> = {
  image_choice: async (exercise) => {
    const cards = exercise.getByRole("group").getByRole("button");
    expect(await cards.count(), "picture cards").toBeGreaterThanOrEqual(3);
  },
  multiple_choice: async (exercise) => {
    const choices = exercise.getByRole("group").getByRole("button");
    expect(await choices.count(), "choices").toBeGreaterThanOrEqual(2);
  },
  fill_blank: async (exercise) => {
    // The gap in the sentence is announced as a blank until a word fills it.
    await expect(exercise.getByText("blank", { exact: true })).toBeAttached();
    expect(await exercise.getByRole("group").getByRole("button").count()).toBeGreaterThanOrEqual(2);
  },
  translate_word_bank: async (exercise) => {
    await expect(exercise.getByRole("group", { name: "Your answer" })).toBeVisible();
    const bank = exercise.getByRole("group", { name: "Word bank" });
    expect(await bank.getByRole("button").count(), "word tiles").toBeGreaterThanOrEqual(2);
  },
  match_pairs: async (exercise) => {
    await expect(exercise.getByRole("group").getByRole("button")).toHaveCount(10);
  },
  type_answer: async (exercise) => {
    await expect(exercise.getByRole("textbox", { name: "Your answer" })).toHaveAttribute(
      "placeholder",
      /^Type in (English|Spanish)$/,
    );
  },
  listen_type: async (exercise) => {
    await expect(exercise.getByRole("button", { name: "Play audio" })).toBeVisible();
    await expect(exercise.getByRole("textbox", { name: "Your answer" })).toBeVisible();
    await expect(exercise.getByRole("button", { name: /^can't listen now$/i })).toBeEnabled();
  },
  speak: async (exercise) => {
    // Speech checking is a placeholder: the microphone is disabled and marked as coming soon.
    await expect(exercise.getByRole("button", { name: /tap to speak/i })).toBeDisabled();
    await expect(exercise).toContainText(/coming soon/i);
    await expect(exercise.getByRole("button", { name: /^can't speak now$/i })).toBeEnabled();
  },
};

const ALL_TYPES = Object.keys(LOOKS_LIKE).sort();

test.describe("exercises", () => {
  test("every exercise type can be answered", async ({ page, api }) => {
    const seen = new Set<ExerciseType>();
    // Lessons 2 and 3 of the current level hold all eight types between them.
    for (let round = 0; round < 2; round += 1) {
      const node = await api.activeNode();
      const lesson = await startActiveLesson(page);
      await expect(page).toHaveURL(new RegExp(`/lesson/${node.next_lesson_id}$`));
      await lesson.playToEnd({
        onExercise: async (id) => {
          const type = exerciseType(id);
          seen.add(type);
          await LOOKS_LIKE[type](lesson.exercise);
        },
      });
      await expect(lesson.completeHeading).toHaveText("Lesson complete!");
      await lesson.finishCelebrations();
    }
    expect([...seen].sort(), "exercise types played").toEqual(ALL_TYPES);
  });

  test("a whole lesson can be played with the keyboard alone", async ({ page, api }) => {
    const node = await api.activeNode();
    await page.goto(`/lesson/${node.next_lesson_id}`);
    const lesson = new LessonPage(page);
    await lesson.waitForExercise();

    // Number keys pick, typing fills the answer box, Enter checks and continues.
    await lesson.playToEnd({ keyboard: true });
    await expect(lesson.completeHeading).toHaveText("Lesson complete!");
    await expect(page.locator("main")).toContainText("100%");
    await lesson.finishCelebrations({ keyboard: true });
    await expect(page).toHaveURL(new RegExp(`/learn\\?done=${node.id}$`));
  });
});
