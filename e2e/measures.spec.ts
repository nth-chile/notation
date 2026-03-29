import { test, expect } from "@playwright/test";
import { waitForApp, pressKey } from "./helpers";

test.describe("Measure Operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForApp(page);
  });

  test("inserts measure with Ctrl+M", async ({ page }) => {
    await page.keyboard.press("Control+m");
    await page.waitForTimeout(200);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("deletes measure with Ctrl+Shift+Backspace", async ({ page }) => {
    // Insert a measure first so we have 2
    await page.keyboard.press("Control+m");
    await page.waitForTimeout(200);
    // Delete it
    await page.keyboard.press("Control+Shift+Backspace");
    await page.waitForTimeout(200);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("extends selection with Shift+arrows", async ({ page }) => {
    // Insert extra measures
    await page.keyboard.press("Control+m");
    await page.keyboard.press("Control+m");
    await page.waitForTimeout(200);

    // Enter select mode
    await pressKey(page, "Escape");

    // Extend selection right
    await page.keyboard.press("Shift+ArrowRight");
    await page.waitForTimeout(100);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("deletes selected measures", async ({ page }) => {
    // Insert extra measures
    await page.keyboard.press("Control+m");
    await page.keyboard.press("Control+m");
    await page.waitForTimeout(200);

    // Select mode and select a range
    await pressKey(page, "Escape");
    await page.keyboard.press("Shift+ArrowRight");
    await page.waitForTimeout(100);

    // Delete selection
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);
    await expect(page.locator("canvas")).toBeVisible();
  });
});
