import { test, expect } from "@playwright/test";
import { waitForApp, pressKey, typeNotes, runCommand } from "./helpers";

test.describe("Plugins & Command Palette", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForApp(page);
  });

  test("command palette opens and searches", async ({ page }) => {
    await page.keyboard.press("Control+Shift+P");
    await page.waitForTimeout(300);

    const input = page.locator('input[placeholder="Type a command..."]');
    await expect(input).toBeVisible();

    await input.fill("transpose");
    await page.waitForTimeout(200);

    // Should show transpose commands (use first() to avoid strict mode with multiple matches)
    await expect(page.getByText("Transpose Up (Half Step)").first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("executes transpose up via command palette", async ({ page }) => {
    await pressKey(page, "c");
    await runCommand(page, "Transpose Up (Half");
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("executes analyze chords via command palette", async ({ page }) => {
    await pressKey(page, "c");
    await pressKey(page, "e");
    await pressKey(page, "g");
    await runCommand(page, "Analyze Chords");
    await expect(page.locator("canvas")).toBeVisible();
  });
});
