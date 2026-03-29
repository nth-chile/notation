import { test, expect } from "@playwright/test";
import { waitForApp, pressKey, typeNotes, runCommand } from "./helpers";

test.describe("Clipboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForApp(page);
    // Insert some notes so there is content to copy
    await typeNotes(page, "CDEF");
  });

  test("copy as ABC executes without crashing", async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await runCommand(page, "Copy as ABC");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("copy as LilyPond executes without crashing", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await runCommand(page, "Copy as LilyPond");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("copy as MusicXML executes without crashing", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await runCommand(page, "Copy as MusicXML");
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });
});
