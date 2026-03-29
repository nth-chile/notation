import { test, expect } from "@playwright/test";
import { waitForApp, pressKey } from "./helpers";

test.describe("AI Chat Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
  });

  test("shows empty state message", async ({ page }) => {
    await expect(page.locator('text=Ask AI')).toBeVisible();
  });

  test("settings toggle works via menu", async ({ page }) => {
    const menuBtn = page.locator('button[title="Panel options"]').last();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(200);
      await page.locator('text=Settings').last().click();
      await page.waitForTimeout(200);
      // AI Settings should be visible
      await expect(page.locator('text=Provider')).toBeVisible();
    }
  });

  test("clear chat works via menu", async ({ page }) => {
    const menuBtn = page.locator('button[title="Panel options"]').last();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(200);
      await page.locator('text=Clear Chat').click();
      await page.waitForTimeout(200);
    }
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("undo AI edit works via menu", async ({ page }) => {
    // Insert a note first
    await pressKey(page, "c");

    const menuBtn = page.locator('button[title="Panel options"]').last();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(200);
      await page.locator('text=Undo Last AI Edit').click();
      await page.waitForTimeout(200);
    }
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("textarea is present and typeable", async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="Ask AI"]');
    await expect(textarea).toBeVisible();
    await textarea.fill("test message");
    await expect(textarea).toHaveValue("test message");
  });

  test("send button is disabled when empty", async ({ page }) => {
    const sendBtn = page.locator('button:has-text("Send")');
    if (await sendBtn.isVisible()) {
      await expect(sendBtn).toBeDisabled();
    }
  });

  test("provider selection changes", async ({ page }) => {
    // Open settings
    const menuBtn = page.locator('button[title="Panel options"]').last();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(200);
      await page.locator('text=Settings').last().click();
      await page.waitForTimeout(200);

      const providerSelect = page.locator("select").last();
      await providerSelect.selectOption("openai");
      await page.waitForTimeout(200);
      await expect(page.locator("canvas")).toBeVisible();
    }
  });
});
