/** Layout checks shared by the phone-width specs. */
import type { Page } from "@playwright/test";

/**
 * How many pixels the page scrolls sideways (0 when everything fits). `scroller` adds an inner
 * scrolling element, such as the lesson player's `main` column.
 */
export function horizontalOverflow(page: Page, scroller?: string): Promise<number> {
  return page.evaluate((selector) => {
    const elements = [document.documentElement];
    if (selector) elements.push(...document.querySelectorAll<HTMLElement>(selector));
    return Math.max(...elements.map((element) => element.scrollWidth - element.clientWidth));
  }, scroller);
}
