import { test } from "@playwright/test";
import { camera, skipOnboarding } from "./helpers";

test.use({ ...camera("squat-front.y4m"), viewport: { width: 1920, height: 1080 } });

/** The Arcade on a 1080p TV, for visual review. */
test("arcade on a big screen", async ({ page }) => {
  test.setTimeout(120_000);
  await skipOnboarding(page);
  await page.goto("/#/arcade");
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "test-results/screens/tv-attract.png" });
  await page.getByTestId("arcade-start").click();
  await page.getByTestId("live-set").waitFor();
  await page.waitForTimeout(14000);
  await page.screenshot({ path: "test-results/screens/tv-live.png" });
});
