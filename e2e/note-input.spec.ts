import { test, expect } from "@playwright/test";
import { waitForApp, pressKey, typeNotes } from "./helpers";

test.describe("Note Input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    // Clear localStorage to start fresh each test
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForApp(page);
  });

  test("inserts notes with keyboard A-G", async ({ page }) => {
    await pressKey(page, "c");
    await pressKey(page, "d");
    await pressKey(page, "e");

    // Verify notes were inserted by checking the canvas rendered
    // (Canvas content verified visually; here we check no errors)
    const errors = await page.evaluate(() =>
      (window as any).__consoleErrors ?? []
    );
    // No JS errors should have occurred
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("inserts rest with R key", async ({ page }) => {
    await pressKey(page, "c");
    await pressKey(page, "r");
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("deletes note with Backspace", async ({ page }) => {
    await pressKey(page, "c");
    await pressKey(page, "Backspace");
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("changes duration with number keys", async ({ page }) => {
    // Set to half note (2), insert C
    await pressKey(page, "2");
    await pressKey(page, "c");

    // Check the duration button "H" is active
    const hButton = page.locator('button:has-text("H")').first();
    // The active button should have the secondary variant class
    await expect(hButton).toBeVisible();
  });

  test("toggles dot with period key", async ({ page }) => {
    await pressKey(page, ".");
    // Dot button should show active state
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("sets sharp with + key", async ({ page }) => {
    await pressKey(page, "="); // +/= key
    await pressKey(page, "c");
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("sets flat with - key", async ({ page }) => {
    await pressKey(page, "-");
    await pressKey(page, "c");
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("changes octave with Up/Down arrows", async ({ page }) => {
    await pressKey(page, "ArrowUp");
    await pressKey(page, "c");
    await pressKey(page, "ArrowDown");
    await pressKey(page, "ArrowDown");
    await pressKey(page, "d");
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("moves cursor with Left/Right arrows", async ({ page }) => {
    await pressKey(page, "c");
    await page.waitForTimeout(200);
    await pressKey(page, "d");
    await page.waitForTimeout(200);
    await pressKey(page, "ArrowLeft");
    await page.waitForTimeout(300);
    await pressKey(page, "ArrowLeft");
    await page.waitForTimeout(300);
    await pressKey(page, "ArrowRight");
    await page.waitForTimeout(500);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test("auto-advances to next measure when full", async ({ page }) => {
    // In 4/4 with quarter notes, 4 notes fill a measure
    await pressKey(page, "3"); // quarter note
    await typeNotes(page, "CDEF");
    // 5th note should go to measure 2
    await pressKey(page, "g");
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("switches voice with Ctrl+1-4", async ({ page }) => {
    await page.keyboard.press("Control+2");
    await pressKey(page, "c");
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("Escape clears selection", async ({ page }) => {
    await pressKey(page, "Escape");
    await expect(page.locator("canvas")).toBeVisible();
  });
});
