import { expect, test } from "@playwright/test";
import { camera, skipOnboarding } from "./helpers";
test.use(camera("squat-front.y4m"));
/**
 * Spotter promises nothing leaves the device. During a whole live set (and a
 * minute after, when MediaPipe's built-in usage logger would report), no
 * request may go to any other host.
 */
test("a live set makes no requests to other servers", async ({ page }) => {
  test.setTimeout(150_000);
  const ext: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (!["localhost", "127.0.0.1"].includes(u.hostname) && !u.protocol.startsWith("data") && !u.protocol.startsWith("blob")) ext.push(`${r.method()} ${r.url().slice(0, 120)}`);
  });
  await skipOnboarding(page);
  await page.goto("/#/go?ex=squat&reps=2");
  await page.getByTestId("summary").waitFor({ timeout: 100_000 });
  await page.waitForTimeout(65_000); // the logger flushes every 60 s
  expect(ext).toEqual([]);
});
