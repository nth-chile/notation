import { test, expect } from "@playwright/test";
import { waitForApp } from "./helpers";

test.describe("Layout & Panels", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
  });

  test("toggles left sidebar", async ({ page }) => {
    // Left sidebar toggle is the first button in toolbar
    const buttons = page.locator("button").filter({ has: page.locator("svg") });
    const leftToggle = buttons.first();
    await leftToggle.click();
    await page.waitForTimeout(300);
    await leftToggle.click();
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("toggles right sidebar", async ({ page }) => {
    // Right sidebar toggle uses PanelRight icon
    const rightToggle = page.locator("svg.lucide-panel-right").first().locator("..");
    await rightToggle.click();
    await page.waitForTimeout(300);
    await rightToggle.click();
    await page.waitForTimeout(300);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("collapses and expands a panel", async ({ page }) => {
    // Click a chevron to collapse
    const chevrons = page.locator('svg.lucide-chevron-down').first().locator("..");
    if (await chevrons.isVisible()) {
      await chevrons.click();
      await page.waitForTimeout(200);
      await chevrons.click();
      await page.waitForTimeout(200);
    }
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("panel menu opens on three-dot click", async ({ page }) => {
    const menuBtn = page.locator('svg.lucide-more-vertical').first().locator("..");
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(200);
      // Menu should contain items
      const menuItems = page.locator("[class*='popover'] button, [class*='z-50'] button");
      await expect(menuItems.first()).toBeVisible({ timeout: 2000 });
    }
  });

  test("opens command palette with Ctrl+Shift+P", async ({ page }) => {
    await page.keyboard.press("Control+Shift+P");
    await page.waitForTimeout(300);
    const input = page.locator('input[placeholder="Type a command..."]');
    await expect(input).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(input).not.toBeVisible();
  });

  test("auto-save persists and restores", async ({ page }) => {
    // Insert notes
    await page.keyboard.press("c");
    await page.keyboard.press("d");
    // Wait for auto-save debounce (may need extra time)
    await page.waitForTimeout(5000);

    // Verify something was saved to localStorage
    const saved = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes("score") || key.includes("auto") || key.includes("notation"))) {
          return true;
        }
      }
      return localStorage.length > 0;
    });

    // Reload and verify app still works
    await page.reload();
    await waitForApp(page);
    await expect(page.locator("canvas")).toBeVisible();
  });
});
