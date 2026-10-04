import { expect, test } from "@playwright/test";

/** Every page renders without errors, in Chrome and in Safari's engine. */
const PAGES = ["/", "/train", "/exercise/squat", "/plans", "/progress", "/assess", "/about", "/settings", "/lab", "/analyze", "/more", "/arcade"];

test("every page renders without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByTestId("get-started").click();
  await page.getByTestId("finish-onboarding").click();
  await expect(page.getByTestId("start-today")).toBeVisible();
  for (const p of PAGES) {
    await page.goto(`/#${p}`);
    await expect(page.locator("h1, .display").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("sample history fills Progress, and a summary opens", async ({ page }) => {
  await page.goto("/?skip#/settings");
  await page.getByTestId("load-sample").click();
  await page.goto("/#/progress");
  await expect(page.getByText("Personal records")).toBeVisible();
  await page.locator('a[href^="#/summary/"]').first().click();
  await expect(page.getByTestId("summary")).toBeVisible();
  await expect(page.getByText("Coach").first()).toBeVisible();
});

test("build, save and start your own workout", async ({ page }) => {
  await page.goto("/?skip#/plans");
  await page.getByTestId("builder-open").click();
  await page.getByTestId("builder-name").fill("Booth warm-up");
  await page.getByTestId("builder-add").click();
  await page.getByLabel("Exercise for set 2").selectOption("jumping-jack");
  await page.getByTestId("builder-save").click();
  await expect(page.getByText("Booth warm-up")).toBeVisible();
  await expect(page.getByText("Squat ×10 · Jumping jack ×10")).toBeVisible();
  await page.getByRole("link", { name: "Start" }).first().click();
  await expect(page.getByTestId("exercise-name")).toContainText("Squat");
  await expect(page.getByTestId("live-set")).toContainText("Set 1 of 2");
});

test("the built-in presentation steps through every slide", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?skip#/pitch");
  for (let i = 0; i < 8; i++) {
    await page.screenshot({ path: `test-results/screens/pitch-${i + 1}.png` });
    await page.keyboard.press("ArrowRight");
  }
  await page.screenshot({ path: "test-results/screens/pitch-9.png" });
  await expect(page.getByText("Try it now.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the share card downloads as a PNG", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "download check in Chrome only");
  test.setTimeout(60_000);
  // Desktop Chrome on macOS supports the share sheet, which a headless test can't close: take the download path.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
  await page.goto("/?skip#/settings");
  await page.getByTestId("load-sample").click();
  await page.goto("/?skip#/progress");
  await page.locator('a[href^="#/summary/"]').first().click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Share card" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^cadence-.*\.png$/);
  await file.saveAs("test-results/screens/share-card.png");
});
