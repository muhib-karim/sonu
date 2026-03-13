import { test, expect } from "@playwright/test";

test.describe("SONU App", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the app title", async ({ page }) => {
    await expect(page.locator("text=SONU")).toBeVisible();
  });

  test("should have settings sidebar", async ({ page }) => {
    await expect(
      page.locator('[data-testid="settings-sidebar"]'),
    ).toBeVisible();
  });

  test("should navigate to different settings sections", async ({ page }) => {
    // Click on General settings
    await page.click("text=General");
    await expect(page.locator("text=General Settings")).toBeVisible();

    // Click on Model settings
    await page.click("text=Model");
    await expect(page.locator("text=Model Settings")).toBeVisible();

    // Click on Advanced settings
    await page.click("text=Advanced");
    await expect(page.locator("text=Advanced Settings")).toBeVisible();
  });

  test("should toggle audio feedback setting", async ({ page }) => {
    await page.click("text=General");

    const toggle = page.locator('[data-testid="audio-feedback-toggle"]');
    await expect(toggle).toBeVisible();

    // Click to toggle
    await toggle.click();

    // Verify the toggle state changed
    await expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  test("should show model selector", async ({ page }) => {
    await page.click("text=Model");

    await expect(page.locator('[data-testid="model-selector"]')).toBeVisible();
  });
});
