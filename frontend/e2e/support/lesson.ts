/**
 * Drives the lesson player through the UI the way a learner would, using the oracle for answers.
 * The player marks each exercise's root with `data-exercise-id`; everything else is found by
 * role, label or visible text.
 */
import { expect, type Locator, type Page } from "@playwright/test";

import { correctAnswer, wrongAnswer, type Card, type Pair } from "./oracle";

/** Footer and exercise labels. Matched without case: some are drawn in caps. */
const LABEL = {
  check: /^check$/i,
  continue: /^continue$/i,
  cantSpeak: /^can't speak now$/i,
  quit: /^quit lesson$/i,
};

/**
 * The player's own marker for answer controls (choices, word tiles, match cards), in the order
 * the number keys reach them (see src/features/lesson/keyboard.ts).
 */
const ANSWER_CONTROL = "[data-lesson-option]";

/** Feedback headings after a miss; any other heading is praise. */
const MISS_HEADINGS = [/^correct solution:?$/i, /^we'll come back to this one\.?$/i];

/** The first celebration screen of every kind of session. */
export const COMPLETE_TITLE = /^(lesson|review|practice|legendary) complete!$|^time's up!$/i;

/** The path, possibly with `?done=<skillId>` (the node just played pops once). */
const LEARN_URL = /\/learn(\?done=\d+)?$/;

export interface Feedback {
  correct: boolean;
  /** Everything the feedback bar says: the praise, or the correct solution. */
  text: string;
}

/** How a session is played: by clicking, or with the keyboard alone. */
export interface InputOptions {
  keyboard?: boolean;
}

type Step = "exercise" | "interstitial" | "celebration" | "dialog";

/** The number key for the control at `index`: 1-9, then 0 for the tenth. */
function digitKey(index: number): string {
  if (index < 0 || index > 9) throw new Error(`no number key reaches control #${index + 1}`);
  return String((index + 1) % 10);
}

/**
 * Waits until the server has accepted a pair: matched cards grey out and become truly disabled.
 * (Every card is only aria-disabled while a pair is being checked, so toBeDisabled() would pass
 * too early and let the next taps land on a locked board.)
 */
async function expectMatched(...cards: Locator[]) {
  for (const card of cards) await expect(card).toHaveJSProperty("disabled", true);
}

/** Each control's label as a screen reader hears it: decorative parts (key hints) left out. */
function labelsOf(controls: Locator): Promise<string[]> {
  return controls.evaluateAll((elements) =>
    elements.map((element) => {
      const copy = element.cloneNode(true) as Element;
      copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
      return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
    }),
  );
}

/** The lesson player (`/lesson/:id`, `/practice`, `/legendary/:id`, `/timed`). */
export class LessonPage {
  /** The root of the exercise on screen (also present while its feedback shows). */
  readonly exercise: Locator;
  /** The result panel that replaces the footer after CHECK. */
  readonly feedbackBar: Locator;
  readonly dialog: Locator;
  readonly completeHeading: Locator;
  readonly footer: Locator;

  constructor(readonly page: Page) {
    this.exercise = page.locator("main [data-exercise-id]");
    this.footer = page.locator("footer");
    this.feedbackBar = this.footer.locator("[role=status]");
    this.dialog = page.getByRole("dialog");
    this.completeHeading = page.getByRole("heading", { level: 1, name: COMPLETE_TITLE });
  }

  get checkButton(): Locator {
    return this.footer.getByRole("button", { name: LABEL.check });
  }

  get continueButton(): Locator {
    return this.footer.getByRole("button", { name: LABEL.continue });
  }

  get quitButton(): Locator {
    return this.page.getByRole("button", { name: LABEL.quit });
  }

  /** The screen that ends a legendary run once its mistakes are used up. */
  get failedHeading(): Locator {
    return this.page.getByRole("heading", { level: 1, name: "So close!" });
  }

  /** The legendary run's budget in the header ("3 mistakes left" for screen readers). */
  mistakesLeft(count: number): Locator {
    const label = `${count} ${count === 1 ? "mistake" : "mistakes"} left`;
    return this.page.locator("header").getByText(label, { exact: true });
  }

  /** The id of the exercise on screen. */
  async exerciseId(): Promise<number> {
    await expect(this.exercise).toHaveCount(1);
    const id = Number(await this.exercise.getAttribute("data-exercise-id"));
    expect(id, "data-exercise-id").toBeGreaterThan(0);
    return id;
  }

  /** The hearts in the lesson header ("4 hearts left" for screen readers). */
  hearts(count: number): Locator {
    const label = `${count} ${count === 1 ? "heart" : "hearts"} left`;
    return this.page.locator("header").getByText(label, { exact: true });
  }

  async heartCount(): Promise<number> {
    const label = this.page.locator("header").getByText(/^\d+ hearts? left$/);
    const text = (await label.textContent()) ?? "";
    return Number(text.match(/\d+/)?.[0] ?? Number.NaN);
  }

  /** Waits until the session has loaded and shows its first exercise. */
  async waitForExercise(): Promise<number> {
    await expect(this.exercise).toBeVisible({ timeout: 20_000 });
    return this.exerciseId();
  }

  // Answering ----------------------------------------------------------------------------------

  /**
   * Answers the exercise on screen correctly. Returns the feedback bar's verdict, or null when
   * the exercise moves on without one ("Can't speak now").
   */
  async answerCorrectly({ keyboard = false }: InputOptions = {}): Promise<Feedback | null> {
    if (keyboard) return this.answerWithKeyboard();
    const id = await this.exerciseId();
    const answer = correctAnswer(id);
    switch (answer.kind) {
      case "option":
        await this.pick(answer.option);
        return this.check();
      case "tiles":
        await this.placeTiles(answer.tiles);
        return this.check();
      case "text":
        await this.type(answer.text);
        return this.check();
      case "pairs":
        for (const pair of answer.pairs) {
          const [left, right] = await this.choosePair(pair);
          await expectMatched(left, right);
        }
        return this.readFeedback();
      case "speak":
        await this.exercise.getByRole("button", { name: LABEL.cantSpeak }).click();
        await expect(this.page.locator(`main [data-exercise-id="${id}"]`)).toHaveCount(0);
        return null;
    }
  }

  /**
   * Answers the exercise on screen wrongly. Choice, word bank and typed exercises are checked
   * and their (red) feedback is returned. A wrong match pair has no feedback bar: this waits for
   * the heart (or legendary mistake) it costs, or for the end of a legendary run, and returns
   * null.
   */
  async answerWrongly(): Promise<Feedback | null> {
    const id = await this.exerciseId();
    const answer = wrongAnswer(id);
    if (answer === null) throw new Error(`exercise ${id} cannot be answered wrongly`);
    switch (answer.kind) {
      case "option":
        await this.pick(answer.option);
        return this.check();
      case "tiles":
        await this.placeTiles(answer.tiles);
        return this.check();
      case "text":
        await this.type(answer.text);
        return this.check();
      case "pair": {
        // "4 hearts left" in lessons, "3 mistakes left" in a legendary run.
        const counter = this.page.locator("header").getByText(/^\d+ (hearts?|mistakes?) left$/);
        const before = (await counter.textContent()) ?? "";
        await this.choosePair(answer.pair);
        await expect(counter.filter({ hasNotText: before }).or(this.failedHeading)).toBeAttached();
        return null;
      }
    }
  }

  /**
   * Answers the exercise on screen correctly without the mouse, the way the player's shortcuts
   * promise: number keys pick choices, word tiles and match cards, typed answers go straight
   * into the focused box, Enter checks, and Tab reaches the remaining buttons.
   */
  private async answerWithKeyboard(): Promise<Feedback | null> {
    const id = await this.exerciseId();
    const answer = correctAnswer(id);
    const keys = this.page.keyboard;
    const controls = this.exercise.locator(ANSWER_CONTROL);
    switch (answer.kind) {
      case "option": {
        const labels = await labelsOf(controls);
        await keys.press(digitKey(labels.indexOf(answer.option.text)));
        await expect(
          this.exercise.getByRole("button", { name: answer.option.text, exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        break;
      }
      case "tiles": {
        // Keys follow the bank's order, which never changes while tiles move to the answer.
        const labels = await labelsOf(
          this.exercise.getByRole("group", { name: "Word bank" }).locator(ANSWER_CONTROL),
        );
        const used = new Set<number>();
        for (const tile of answer.tiles) {
          const index = labels.findIndex((label, at) => label === tile.text && !used.has(at));
          used.add(index);
          await keys.press(digitKey(index));
        }
        const placed = this.exercise.getByRole("group", { name: "Your answer" });
        await expect(placed.getByRole("button")).toHaveCount(answer.tiles.length);
        break;
      }
      case "text":
        // The answer box takes focus as the exercise opens.
        await expect(this.exercise.getByRole("textbox", { name: "Your answer" })).toBeFocused();
        await keys.type(answer.text);
        break;
      case "pairs":
        for (const { left, right } of answer.pairs) {
          // 1-5 pick from the left column, 6-0 from the right; a word may sit in both columns.
          const labels = await labelsOf(controls);
          const leftIndex = labels.indexOf(left.text);
          const rightIndex = labels.lastIndexOf(right.text);
          await keys.press(digitKey(leftIndex));
          await keys.press(digitKey(rightIndex));
          await expectMatched(controls.nth(leftIndex), controls.nth(rightIndex));
        }
        return this.readFeedback();
      case "speak": {
        const skip = this.exercise.getByRole("button", { name: LABEL.cantSpeak });
        for (let presses = 0; presses < 20; presses += 1) {
          if (await skip.evaluate((button) => button === document.activeElement)) break;
          await keys.press("Tab");
        }
        await expect(skip).toBeFocused();
        await keys.press("Enter");
        await expect(this.page.locator(`main [data-exercise-id="${id}"]`)).toHaveCount(0);
        return null;
      }
    }
    await keys.press("Enter");
    return this.readFeedback();
  }

  /**
   * Presses CONTINUE on the feedback bar (or Enter: the button takes focus as the bar opens);
   * waits until the bar is gone or a dialog took over.
   */
  async continueAfterFeedback({ keyboard = false }: InputOptions = {}): Promise<void> {
    if (keyboard) {
      await expect(this.continueButton).toBeFocused();
      await this.page.keyboard.press("Enter");
    } else {
      await this.continueButton.click();
    }
    await expect(async () => {
      const gone = (await this.feedbackBar.count()) === 0;
      expect(gone || (await this.dialog.isVisible())).toBe(true);
    }).toPass({ timeout: 15_000 });
  }

  private async pick(option: Card) {
    await this.exercise.getByRole("button", { name: option.text, exact: true }).click();
  }

  private async placeTiles(tiles: Card[]) {
    const bank = this.exercise.getByRole("group", { name: "Word bank" });
    for (const tile of tiles) {
      // A placed tile leaves the bank, so a repeated word picks up the next copy.
      await bank.getByRole("button", { name: tile.text, exact: true }).first().click();
    }
    const answer = this.exercise.getByRole("group", { name: "Your answer" });
    await expect(answer.getByRole("button")).toHaveCount(tiles.length);
  }

  private async type(text: string) {
    await this.exercise.getByRole("textbox", { name: "Your answer" }).fill(text);
  }

  /** Taps a left card, then a right one. A word in both columns: the first is on the left. */
  private async choosePair({ left, right }: Pair): Promise<[Locator, Locator]> {
    const leftCard = this.exercise.getByRole("button", { name: left.text, exact: true }).first();
    const rightCard = this.exercise.getByRole("button", { name: right.text, exact: true }).last();
    await leftCard.click();
    await rightCard.click();
    return [leftCard, rightCard];
  }

  private async check(): Promise<Feedback> {
    await this.checkButton.click();
    return this.readFeedback();
  }

  private async readFeedback(): Promise<Feedback> {
    await expect(this.feedbackBar).toBeVisible();
    const heading = (await this.feedbackBar.getByRole("heading").innerText()).trim();
    const text = (await this.feedbackBar.innerText()).replace(/\s+/g, " ").trim();
    return { correct: !MISS_HEADINGS.some((pattern) => pattern.test(heading)), text };
  }

  // Whole sessions -----------------------------------------------------------------------------

  /** What the player shows next: an exercise, an interstitial, the results or a dialog. */
  async nextStep(): Promise<Step> {
    const interstitial = this.footer.locator('button:not([aria-busy="true"])', {
      hasText: LABEL.continue,
    });
    const steps: [Step, Locator][] = [
      ["dialog", this.dialog],
      ["celebration", this.completeHeading],
      ["exercise", this.exercise],
      ["interstitial", interstitial],
    ];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        this.dialog.or(this.completeHeading).or(this.exercise).or(interstitial).first(),
      ).toBeVisible({ timeout: 20_000 });
      for (const [step, locator] of steps) {
        if (await locator.first().isVisible()) return step;
      }
    }
    throw new Error("the lesson player shows nothing recognisable");
  }

  /**
   * Answers every exercise correctly (moving past interstitials) until the first results screen.
   * `limit` stops after that many answers instead; `onExercise` sees each exercise first.
   */
  async playToEnd({
    limit = Number.POSITIVE_INFINITY,
    onExercise,
    keyboard = false,
  }: InputOptions & {
    limit?: number;
    onExercise?: (exerciseId: number) => Promise<void>;
  } = {}): Promise<void> {
    let answered = 0;
    for (let guard = 0; guard < 100; guard += 1) {
      if (answered >= limit) return;
      const step = await this.nextStep();
      if (step === "celebration") return;
      if (step === "dialog") {
        throw new Error(`unexpected dialog: ${await this.dialog.first().innerText()}`);
      }
      if (step === "interstitial") {
        if (keyboard) await this.page.keyboard.press("Enter");
        else await this.continueButton.click();
        await expect(this.exercise).toBeVisible();
        continue;
      }
      await onExercise?.(await this.exerciseId());
      const feedback = await this.answerCorrectly({ keyboard });
      answered += 1;
      if (feedback !== null) {
        expect(feedback.correct, `feedback: ${feedback.text}`).toBe(true);
        await this.continueAfterFeedback({ keyboard });
      }
    }
    throw new Error("the session did not finish");
  }

  /**
   * Presses CONTINUE (or Enter, as each screen focuses it) through the remaining results screens
   * until the path is back. Returns the text of each screen passed.
   */
  async finishCelebrations({ keyboard = false }: InputOptions = {}): Promise<string[]> {
    const main = this.page.locator("main");
    const screens: string[] = [];
    for (let guard = 0; guard < 15; guard += 1) {
      if (isLearnPage(this.page)) break;
      await expect(this.continueButton).toBeVisible();
      const before = await main.innerText();
      screens.push(before.replace(/\s+/g, " ").trim());
      if (keyboard) {
        await expect(this.continueButton).toBeFocused();
        await this.page.keyboard.press("Enter");
      } else {
        await this.continueButton.click();
      }
      await expect(async () => {
        const moved = isLearnPage(this.page) || (await main.innerText()) !== before;
        expect(moved).toBe(true);
      }).toPass({ timeout: 15_000 });
    }
    await this.page.waitForURL(LEARN_URL);
    return screens;
  }
}

function isLearnPage(page: Page): boolean {
  return new URL(page.url()).pathname === "/learn";
}

/** The active level on the path (the one with the START bubble). */
export function currentLevel(page: Page): Locator {
  return page.getByRole("button", { name: /, current level, lesson \d+ of \d+$/ });
}

/** Opens the path, clicks the active node and starts its lesson from the popover. */
export async function startActiveLesson(page: Page): Promise<LessonPage> {
  await page.goto("/learn");
  await currentLevel(page).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /^start \+10 xp$/i })
    .click();
  await page.waitForURL(/\/lesson\/\d+$/);
  const lesson = new LessonPage(page);
  await lesson.waitForExercise();
  return lesson;
}
