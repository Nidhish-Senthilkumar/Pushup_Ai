import { test } from "@playwright/test";

/** Screenshot tour of every page at phone and desktop size, for visual review. */
const PAGES = ["/", "/train", "/exercise/pushup", "/plans", "/progress", "/assess", "/about", "/settings", "/lab", "/analyze", "/more"];

for (const size of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
]) {
  test(`screens ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/");
    await page.screenshot({ path: `test-results/screens/${size.name}-onboarding.png`, fullPage: false });
    await page.getByTestId("get-started").click();
    await page.getByTestId("name-input").fill("Alex");
    await page.getByTestId("finish-onboarding").click();
    await page.goto("/#/settings");
    await page.getByTestId("load-sample").click();
    for (const p of PAGES) {
      await page.goto(`/#${p}`);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `test-results/screens/${size.name}${p.replace(/\//g, "_") || "_home"}.png`, fullPage: true });
    }
    // A summary of one of the sample workouts.
    await page.goto("/#/progress");
    await page.locator('a[href^="#/summary/"]').first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/screens/${size.name}_summary.png`, fullPage: true });
    await page.goto("/#/arcade");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/screens/${size.name}_arcade.png`, fullPage: false });
  });
}
