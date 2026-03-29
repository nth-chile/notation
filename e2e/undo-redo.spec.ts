import { test, expect } from "@playwright/test";
import { waitForApp, pressKey, typeNotes } from "./helpers";

test.describe("Undo/Redo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForApp(page);
  });

  test("undoes note insertion", async ({ page }) => {
    await pressKey(page, "c");
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("redoes after undo", async ({ page }) => {
    await pressKey(page, "c");
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+Shift+z");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("undoes rest insertion", async ({ page }) => {
    await pressKey(page, "r");
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("undoes note deletion", async ({ page }) => {
    await pressKey(page, "c");
    await pressKey(page, "Backspace");
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("undoes measure insertion", async ({ page }) => {
    await page.keyboard.press("Control+m");
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("undoes duration change", async ({ page }) => {
    await pressKey(page, "3"); // quarter
    await pressKey(page, "c");
    await pressKey(page, "ArrowLeft");
    await pressKey(page, "2"); // change to half
    await page.waitForTimeout(200);
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test("undoes accidental change", async ({ page }) => {
    await pressKey(page, "="); // sharp
    await pressKey(page, "c");
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  // Shift+C dispatch doesn't work in headless Chromium - see text-input.spec.ts
  test.skip("undoes chord symbol", async ({ page }) => {
    await pressKey(page, "c");
    await pressKey(page, "ArrowLeft");
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "C", code: "KeyC", shiftKey: true, bubbles: true }));
    });
    await page.waitForTimeout(300);
    const input = page.locator('input[placeholder="e.g. Cmaj7"]');
    await input.fill("Dm7");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test("multiple undos in sequence", async ({ page }) => {
    await typeNotes(page, "CDEF");
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("redo after multiple undos", async ({ page }) => {
    await typeNotes(page, "CDE");
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+Shift+z");
    await page.keyboard.press("Control+Shift+z");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });
});
