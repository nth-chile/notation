import { test, expect } from "@playwright/test";
import { waitForApp, pressKey } from "./helpers";

test.describe("View Modes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
  });

  test("switches to Full Score with Ctrl+Shift+4", async ({ page }) => {
    await page.keyboard.press("Control+Shift+4");
    await page.waitForTimeout(300);
    const btn = page.locator('button:has-text("Full Score")');
    await expect(btn).toBeVisible();
  });

  test("switches to Lead Sheet with Ctrl+Shift+2", async ({ page }) => {
    await page.keyboard.press("Control+Shift+2");
    await page.waitForTimeout(300);
    const btn = page.locator('button:has-text("Lead Sheet")');
    await expect(btn).toBeVisible();
  });

  test("switches to Songwriter with Ctrl+Shift+1", async ({ page }) => {
    await page.keyboard.press("Control+Shift+1");
    await page.waitForTimeout(300);
    const btn = page.locator('button:has-text("Songwriter")');
    await expect(btn).toBeVisible();
  });

  test("switches to Tab with Ctrl+Shift+3", async ({ page }) => {
    await page.keyboard.press("Control+Shift+3");
    await page.waitForTimeout(300);
    const btn = page.locator('button:has-text("Tab")');
    await expect(btn).toBeVisible();
  });

  test("switches view by clicking view tab", async ({ page }) => {
    await page.locator('button:has-text("Lead Sheet")').click();
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("renders canvas in all views without errors", async ({ page }) => {
    // Insert some notes first
    await pressKey(page, "c");
    await pressKey(page, "d");
    await pressKey(page, "e");

    for (const view of ["1", "2", "3", "4"]) {
      await page.keyboard.press(`Control+Shift+${view}`);
      await page.waitForTimeout(500);
      await expect(page.locator("canvas")).toBeVisible();
    }
  });
});
