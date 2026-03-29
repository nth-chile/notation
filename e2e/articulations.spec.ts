import { test, expect } from "@playwright/test";
import { waitForApp, pressKey } from "./helpers";

test.describe("Articulations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForApp(page);
  });

  test("toggles accent with Shift+>", async ({ page }) => {
    await pressKey(page, "c");
    await pressKey(page, "ArrowLeft");
    await page.keyboard.press("Shift+.");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test("toggles staccato with Shift+<", async ({ page }) => {
    await pressKey(page, "c");
    await pressKey(page, "ArrowLeft");
    await page.keyboard.press("Shift+,");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test("toggles tenuto with Shift+T", async ({ page }) => {
    await pressKey(page, "c");
    await pressKey(page, "ArrowLeft");
    await page.keyboard.press("Shift+t");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test("toggles fermata with Shift+U", async ({ page }) => {
    await pressKey(page, "c");
    await pressKey(page, "ArrowLeft");
    await page.keyboard.press("Shift+u");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test("toggles marcato with Shift+^", async ({ page }) => {
    await pressKey(page, "c");
    await pressKey(page, "ArrowLeft");
    await page.keyboard.press("Shift+6");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });
});
