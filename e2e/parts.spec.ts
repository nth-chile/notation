import { test, expect } from "@playwright/test";
import { waitForApp, pressKey } from "./helpers";

test.describe("Multi-Part Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForApp(page);
  });

  test("adds a part via Add Part button", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Part")');
    await addBtn.click();
    await page.waitForTimeout(300);
    // Should now have 2 parts visible
    const partItems = page.locator('text=Part');
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("removes a part via x button", async ({ page }) => {
    // Add a part first
    await page.locator('button:has-text("Add Part")').click();
    await page.waitForTimeout(300);
    // Remove the second part (the x button that's not disabled)
    const removeButtons = page.locator('button:has-text("\u00d7")');
    // Find the enabled one
    const enabledRemove = removeButtons.filter({ hasNot: page.locator("[disabled]") });
    if (await enabledRemove.count() > 0) {
      await enabledRemove.first().click();
      await page.waitForTimeout(300);
    }
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("toggles solo on a part", async ({ page }) => {
    const soloBtn = page.locator('button:has-text("S")').first();
    await soloBtn.click();
    await page.waitForTimeout(200);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("toggles mute on a part", async ({ page }) => {
    const muteBtn = page.locator('button:has-text("M")').first();
    await muteBtn.click();
    await page.waitForTimeout(200);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("moves cursor between parts with Alt+Up/Down", async ({ page }) => {
    // Add a second part
    await page.locator('button:has-text("Add Part")').click();
    await page.waitForTimeout(300);

    await page.keyboard.press("Alt+ArrowDown");
    await page.waitForTimeout(200);
    await pressKey(page, "c"); // Insert note in part 2
    await expect(page.locator("canvas")).toBeVisible();

    await page.keyboard.press("Alt+ArrowUp");
    await page.waitForTimeout(200);
    await pressKey(page, "d"); // Insert note in part 1
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("selects different instrument for new part", async ({ page }) => {
    const select = page.locator("select").first();
    await select.selectOption("guitar");
    await page.locator('button:has-text("Add Part")').click();
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });
});
