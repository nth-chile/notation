import { type Page, expect } from "@playwright/test";

/** Wait for the app to fully load (canvas rendered) */
export async function waitForApp(page: Page) {
  await page.waitForSelector("canvas", { timeout: 10000 });
  // Wait for at least one render cycle
  await page.waitForTimeout(500);
}

/** Press a key and wait for the UI to update */
export async function pressKey(page: Page, key: string) {
  await page.keyboard.press(key);
  await page.waitForTimeout(100);
}

/** Get the status bar text */
export async function getStatusText(page: Page): Promise<string> {
  const bar = page.locator('[class*="border-t"]').last();
  return (await bar.textContent()) ?? "";
}

/** Get the current score from the store */
export async function getScore(page: Page) {
  return page.evaluate(() => {
    // Access Zustand store directly
    const store = (window as any).__ZUSTAND_STORE__;
    if (store) return store.getState().score;
    return null;
  });
}

/** Expose the Zustand store on window for test access */
export async function exposeStore(page: Page) {
  await page.evaluate(() => {
    // The store is imported as a module singleton, we need to reach it via React internals
    // Instead, we'll use the DOM as our test interface
  });
}

/** Count measures in the first part by reading the store */
export async function getMeasureCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    // Walk the DOM to find measure data indirectly via the canvas
    // Better approach: expose via a data attribute
    const container = document.querySelector("[data-score-container]");
    if (!container) return -1;
    // We'll use the store exposed by the app
    return -1; // Fallback; real tests use keyboard-driven assertions
  });
}

/** Type a note sequence like "C D E F" */
export async function typeNotes(page: Page, notes: string) {
  for (const char of notes) {
    if (char === " ") continue;
    await pressKey(page, char.toLowerCase());
  }
}

/** Open command palette and run a command */
export async function runCommand(page: Page, commandLabel: string) {
  await page.keyboard.press("Control+Shift+P");
  await page.waitForTimeout(200);
  const input = page.locator('input[placeholder="Type a command..."]');
  await input.fill(commandLabel);
  await page.waitForTimeout(100);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
}
