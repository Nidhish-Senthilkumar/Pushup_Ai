import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { camera, fake, skipOnboarding } from "./helpers";

test.use(camera("jj-front.y4m"));

test.describe("Arcade", () => {
  test.skip(!existsSync(fake("jj-front.y4m")), "run scripts/fetch-test-videos.sh");

  test("a jumping jack challenge puts the player on the board", async ({ page }) => {
    test.setTimeout(150_000);
    await skipOnboarding(page);
    await page.goto("/#/arcade");
    await page.getByTestId("challenge-jack-blitz").click();
    await page.screenshot({ path: "test-results/screens/arcade-attract-live.png" });
    await page.getByTestId("arcade-start").click();
    await expect(page.getByTestId("live-set")).toHaveAttribute("data-phase", /countdown|active/, { timeout: 60_000 });
    await page.waitForTimeout(8000);
    await page.screenshot({ path: "test-results/screens/arcade-live.png" });
    await expect(page.getByTestId("arcade-result")).toBeVisible({ timeout: 60_000 });
    const score = Number(await page.getByTestId("arcade-score").textContent());
    expect(score).toBeGreaterThanOrEqual(3);
    await page.getByTestId("arcade-name").fill("Booth Test");
    await page.getByTestId("arcade-name").press("Enter");
    await page.screenshot({ path: "test-results/screens/arcade-result.png" });
    await page.getByTestId("arcade-again").click();
    await expect(page.getByTestId("leaderboard")).toContainText("Booth Test");
  });
});
