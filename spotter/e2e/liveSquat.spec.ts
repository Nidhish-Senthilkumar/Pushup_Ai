import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { camera, fake, skipOnboarding } from "./helpers";

test.use(camera("squat-front.y4m"));

test.describe("squats from the front", () => {
  test.skip(!existsSync(fake("squat-front.y4m")), "run scripts/fetch-test-videos.sh");

  test("a 2-rep set starts hands-free, counts and lands on the summary", async ({ page }) => {
    test.setTimeout(150_000);
    await skipOnboarding(page);
    await page.goto("/#/go?ex=squat&reps=2");
    await expect(page.getByTestId("live-set")).toBeVisible();
    // Hands-free start: standing in view starts the countdown on its own.
    await expect(page.getByTestId("live-set")).toHaveAttribute("data-phase", /countdown|active/, { timeout: 60_000 });
    await expect(page.getByTestId("rep-counter")).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: "test-results/screens/live-squat.png" });
    await expect(page.getByTestId("summary")).toBeVisible({ timeout: 100_000 });
    await expect(page.getByTestId("summary-reps")).toHaveText("2");
    await page.screenshot({ path: "test-results/screens/live-squat-summary.png", fullPage: true });
  });
});

test.describe("guided workout", () => {
  test.skip(!existsSync(fake("squat-front.y4m")), "run scripts/fetch-test-videos.sh");

  test("set, rest with a preview of what's next, next set, then a saved summary", async ({ page }) => {
    test.setTimeout(150_000);
    await skipOnboarding(page);
    await page.goto("/#/go?workout=desk-break");
    await expect(page.getByTestId("exercise-name")).toContainText("Squat");
    await expect(page.getByTestId("live-set")).toHaveAttribute("data-phase", "active", { timeout: 60_000 });
    // Wait for the first real squat to be counted, then end the set early.
    await expect(page.getByTestId("rep-counter")).toContainText(/^[1-9]/, { timeout: 60_000 });
    await page.getByTestId("finish").click();
    await expect(page.getByTestId("rest")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("rest")).toContainText("Shoulder press");
    await page.screenshot({ path: "test-results/screens/rest.png" });
    await page.getByTestId("skip-rest").click();
    await expect(page.getByTestId("exercise-name")).toContainText("Shoulder press");
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("summary")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Desk Break").first()).toBeVisible();
  });
});

test.describe("Data Lab", () => {
  test.skip(!existsSync(fake("squat-front.y4m")), "run scripts/fetch-test-videos.sh");

  test("records labelled frames in the team's CSV format", async ({ page }) => {
    test.setTimeout(120_000);
    await skipOnboarding(page);
    await page.goto("/#/lab");
    await page.getByRole("combobox").first().selectOption("squat");
    await page.getByTestId("lab-record").click();
    await expect(page.getByTestId("live-set")).toHaveAttribute("data-phase", "active", { timeout: 60_000 });
    await page.waitForTimeout(5000);
    await page.getByTestId("finish").click();
    await expect(page.getByText(/squat · good/)).toBeVisible({ timeout: 10_000 });
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download everything/ }).click();
    const file = await download;
    const text = await (await file.createReadStream()).toArray();
    const csv = Buffer.concat(text.map((b) => Buffer.from(b))).toString();
    const first = csv.split("\n")[0]!.split(",");
    expect(first).toHaveLength(5);
    expect(first[4]).toBe("0");
  });
});
