import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { camera, fake, skipOnboarding } from "./helpers";

test.use({ ...camera("squat-front.y4m"), viewport: { width: 390, height: 844 }, hasTouch: true });

test("live set on a phone-sized screen", async ({ page }) => {
  test.skip(!existsSync(fake("squat-front.y4m")), "run scripts/fetch-test-videos.sh");
  test.setTimeout(120_000);
  await skipOnboarding(page);
  await page.goto("/#/go?ex=squat&reps=2");
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "test-results/screens/phone-live-setup.png" });
  await expect(page.getByTestId("live-set")).toHaveAttribute("data-phase", "active", { timeout: 60_000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "test-results/screens/phone-live-active.png" });
  await expect(page.getByTestId("summary")).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: "test-results/screens/phone-live-summary.png", fullPage: true });
});
