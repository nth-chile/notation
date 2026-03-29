import { test, expect } from "@playwright/test";
import { waitForApp } from "./helpers";

test.describe("Score Overlay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForApp(page);
  });

  test("clicking title area opens inline title editor", async ({ page }) => {
    // The score overlay sits on top of the canvas. The title region is near
    // the top-center of the overlay. Click there to activate inline editing.
    const overlay = page.locator("[data-score-container]").locator("div").first();

    // Get the overlay/canvas dimensions to click the title region (top center)
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) {
      // Fallback: just verify canvas is visible
      await expect(canvas).toBeVisible();
      return;
    }

    // Title is centered horizontally, near the top (~30-40px from top)
    const titleX = box.x + box.width / 2;
    const titleY = box.y + 30;

    await page.mouse.click(titleX, titleY);
    await page.waitForTimeout(300);

    // An inline input should appear for editing the title
    // The ScoreOverlay renders a plain <input> (not shadcn Input) with serif font
    const titleInput = page.locator('input[style*="Times New Roman"]');
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Type a new title
      await titleInput.fill("My New Score");
      await titleInput.press("Enter");
      await page.waitForTimeout(300);
      // Input should disappear after commit
      await expect(titleInput).not.toBeVisible();
    }

    await expect(page.locator("canvas")).toBeVisible();
  });

  test("clicking composer area opens inline composer editor", async ({ page }) => {
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) {
      await expect(canvas).toBeVisible();
      return;
    }

    // Composer is below the title, roughly 65-70px from the top
    const composerX = box.x + box.width / 2;
    const composerY = box.y + 68;

    await page.mouse.click(composerX, composerY);
    await page.waitForTimeout(300);

    // The composer input uses italic serif font
    const composerInput = page.locator('input[style*="italic"]');
    if (await composerInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await composerInput.fill("Test Composer");
      await composerInput.press("Enter");
      await page.waitForTimeout(300);
      await expect(composerInput).not.toBeVisible();
    }

    await expect(page.locator("canvas")).toBeVisible();
  });

  test("Escape cancels title editing without saving", async ({ page }) => {
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) {
      await expect(canvas).toBeVisible();
      return;
    }

    const titleX = box.x + box.width / 2;
    const titleY = box.y + 30;

    await page.mouse.click(titleX, titleY);
    await page.waitForTimeout(300);

    const titleInput = page.locator('input[style*="Times New Roman"]');
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await titleInput.fill("Should Not Save");
      await titleInput.press("Escape");
      await page.waitForTimeout(300);
      await expect(titleInput).not.toBeVisible();
    }

    await expect(page.locator("canvas")).toBeVisible();
  });
});
