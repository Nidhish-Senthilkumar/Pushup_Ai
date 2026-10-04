import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * The pose model has to run in Safari's engine too: at a convention most
 * visitors scanning the QR code are on iPhones. WebKit has no fake camera, so
 * this runs a real clip through Analyze a video, which uses the same model and
 * engine as the live camera.
 */
const CLIP = path.join(path.dirname(new URL(import.meta.url).pathname), ".cache", "clips", "squat-rear.webm");

test("pose model runs and counts real squats", async ({ page, browserName }) => {
  test.skip(!existsSync(CLIP), "missing test clip");
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/analyze");
  await page.getByTestId("analyze-exercise").selectOption("squat");
  await page.getByTestId("analyze-file").setInputFiles(CLIP);
  await page.getByTestId("analyze-run").click();
  await expect(page.getByTestId("analyze-result")).toBeVisible({ timeout: 280_000 });
  const text = (await page.getByTestId("analyze-count").textContent()) ?? "";
  console.log(browserName, text);
  expect(text).toBe("2 reps");
  expect(errors).toEqual([]);
});
