import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { camera, fake, skipOnboarding } from "./helpers";

test.use(camera("pushup-side.y4m"));

test.describe("push-ups from the side", () => {
  test.skip(!existsSync(fake("pushup-side.y4m")), "run scripts/fetch-test-videos.sh");

  test("counts push-ups live and shows the skeleton", async ({ page }) => {
    test.setTimeout(150_000);
    await skipOnboarding(page);
    await page.goto("/#/go?ex=pushup&reps=2");
    await expect(page.getByTestId("live-set")).toHaveAttribute("data-phase", /countdown|active/, { timeout: 60_000 });
    await page.getByTestId("xray").click();
    await expect(page.getByTestId("xray-panel")).toContainText("Elbow angle");
    await page.waitForTimeout(4000);
    await page.screenshot({ path: "test-results/screens/live-pushup.png" });
    await expect(page.getByTestId("summary")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByTestId("summary-reps")).toHaveText("2");
  });
});

test.describe("fitness test", () => {
  test.skip(!existsSync(fake("pushup-side.y4m")), "run scripts/fetch-test-videos.sh");

  test("max push-ups ends on its own when the reps stop, then moves to the squat test", async ({ page }) => {
    test.setTimeout(200_000);
    await skipOnboarding(page);
    await page.goto("/#/assess");
    await page.getByTestId("assess-start").click();
    await expect(page.getByTestId("exercise-name")).toContainText("Push-up");
    await expect(page.getByTestId("live-set")).toHaveAttribute("data-phase", "active", { timeout: 60_000 });
    // The clip's long pauses at the top end the max test after a rep or two.
    await expect(page.getByTestId("assess-between")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByTestId("assess-between")).toContainText("Next: 60-second squats");
    await page.getByTestId("assess-next").click();
    await expect(page.getByTestId("exercise-name")).toContainText("Squat");
  });
});
