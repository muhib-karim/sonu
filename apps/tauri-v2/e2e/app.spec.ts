import { test, expect } from "@playwright/test";

test.describe("SONU App", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the app title", async ({ page }) => {
    await expect(page.getByText("SONU", { exact: true })).toBeVisible();
  });

  test("should have navigation sidebar", async ({ page }) => {
    for (const item of [
      "Home",
      "Dictionary",
      "Snippets",
      "Notes",
      "Style",
      "Settings",
      "Appearance",
      "Advanced",
      "Cloud",
      "History",
      "About",
    ]) {
      await expect(page.getByText(item, { exact: true })).toBeVisible();
    }
  });

  test("should navigate to different sections", async ({ page }) => {
    await page.getByText("Dictionary", { exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Dictionary" }),
    ).toBeVisible();

    await page.getByText("Notes", { exact: true }).click();
    await expect(page.locator("main, body")).toBeVisible();

    await page.getByText("History", { exact: true }).click();
    await expect(page.locator("main, body")).toBeVisible();

    // Return home and verify the dashboard renders
    await page.getByText("Home", { exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Speak Everywhere" }),
    ).toBeVisible();
  });

  test("should show home dashboard stats", async ({ page }) => {
    await expect(
      page.getByText("Dictation time", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Words dictated", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Time saved", { exact: true })).toBeVisible();
  });

  test("should render appearance controls", async ({ page }) => {
    await page.getByText("Appearance", { exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Appearance" }),
    ).toBeVisible();

    // Theme mode segmented control (dark is the default)
    for (const mode of ["light", "dark", "system"]) {
      await expect(
        page.locator(`[data-testid="theme-mode-${mode}"]`),
      ).toBeVisible();
    }

    // Accent swatches render
    for (const accent of ["zinc", "violet", "blue", "green", "amber", "rose"]) {
      await expect(
        page.locator(`[data-testid="accent-${accent}"]`),
      ).toBeVisible();
    }

    // Live preview toggle is present
    await expect(
      page.getByText("Live transcription preview", { exact: true }),
    ).toBeVisible();
  });

  test("should show version in footer", async ({ page }) => {
    await expect(page.getByText(/v\d+\.\d+\.\d+/)).toBeVisible();
  });
});
