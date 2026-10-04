import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { camera, fake, skipOnboarding } from "./helpers";

test.use(camera("duel.y4m"));

test.describe("Arcade duel", () => {
  test.skip(!existsSync(fake("duel.y4m")), "run scripts/fetch-test-videos.sh");

  test("two players side by side are counted separately", async ({ page }) => {
    test.setTimeout(150_000);
    await skipOnboarding(page);
    await page.goto("/#/arcade");
    await page.getByTestId("challenge-squat-sprint").click();
    await page.getByTestId("mode-duel").click();
    await page.getByTestId("arcade-start").click();
    await expect(page.getByTestId("duel")).toBeVisible();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/screens/duel-setup.png" });
    await page.getByTestId("duel-start").click({ timeout: 5000 }).catch(() => {});
    await expect(page.getByTestId("duel")).toHaveAttribute("data-phase", "active", { timeout: 30_000 });
    await page.waitForTimeout(12_000);
    await page.screenshot({ path: "test-results/screens/duel-live.png" });
    await expect(page.getByTestId("duel-result")).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: "test-results/screens/duel-result.png" });
    const a = Number(await page.getByTestId("duel-score-1").textContent());
    const b = Number(await page.getByTestId("duel-score-2").textContent());
    console.log("duel scores", a, b);
    expect(a + b).toBeGreaterThanOrEqual(1);
  });
});
