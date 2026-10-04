import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { camera, fake } from "./helpers";

/**
 * Records a demo video of Spotter (sample history, a live squat set with real
 * footage as the camera, the summary, an Arcade round, progress, the slides).
 * Not part of the normal suite:
 *
 *   RECORD_DEMO=1 npx playwright test recordDemo --project=chrome
 *
 * The video lands in test-results/; convert with ffmpeg for sharing.
 */
test.use({ ...camera("squat-front.y4m"), viewport: { width: 1280, height: 720 }, video: { mode: "on", size: { width: 1280, height: 720 } } });

test("demo tour", async ({ page }) => {
  test.skip(!process.env.RECORD_DEMO, "set RECORD_DEMO=1 to record the demo video");
  test.skip(!existsSync(fake("squat-front.y4m")), "run scripts/fetch-test-videos.sh");
  test.setTimeout(300_000);
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("spotter.v1", JSON.stringify({ version: 1, profile: { name: "Alex", onboarded: true }, settings: { voice: false, sounds: false, arcadeSeconds: 20, strictness: "standard" } })),
  );
  await page.goto("/#/settings");
  await page.getByTestId("load-sample").click();

  // Home and the library.
  await page.goto("/#/");
  await page.waitForTimeout(2500);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(1500);
  await page.goto("/#/train");
  await page.waitForTimeout(2500);
  await page.goto("/#/exercise/squat");
  await page.waitForTimeout(2500);

  // A live set: real squat footage plays as the camera.
  await page.getByTestId("start-set").click();
  await expect(page.getByTestId("live-set")).toHaveAttribute("data-phase", /countdown|active/, { timeout: 60_000 });
  await page.waitForTimeout(4000);
  await page.getByTestId("xray").click();
  await expect(page.getByTestId("summary")).toBeVisible({ timeout: 120_000 });
  await page.waitForTimeout(2500);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(2500);

  // An Arcade round: only clean squats count.
  await page.goto("/#/arcade");
  await page.waitForTimeout(3000);
  await page.getByTestId("arcade-start").click();
  await expect(page.getByTestId("arcade-result")).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(3500);

  // Progress and the built-in slides.
  await page.goto("/#/progress");
  await page.waitForTimeout(2500);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(2000);
  await page.goto("/#/pitch");
  await page.waitForTimeout(2500);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(2000);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(2500);
});
