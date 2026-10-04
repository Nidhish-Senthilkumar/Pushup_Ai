import { expect, test } from "@playwright/test";

/**
 * Convention Wi-Fi drops. After a single visit (no workout started), the app,
 * the pose runtime and the model must all load with no network at all.
 */
test("works offline after one visit", async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.goto("/?skip#/");
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 30_000 });
  // Wait until the background caching has stored the pose model.
  await page.waitForFunction(
    async () => {
      const keys = await caches.keys();
      for (const k of keys) {
        const cache = await caches.open(k);
        const reqs = await cache.keys();
        const model = reqs.find((r) => /pose_landmarker_.*\.task$/.test(r.url));
        const wasm = reqs.find((r) => /vision_wasm_internal\.wasm$/.test(r.url));
        if (!model || !wasm) continue;
        // Fully stored, not just started.
        const sizes = await Promise.all([model, wasm].map(async (r) => (await (await cache.match(r))!.blob()).size));
        if (sizes.every((n) => n > 1_000_000)) return true;
      }
      return false;
    },
    null,
    { timeout: 60_000, polling: 1000 },
  );
  // Let the cache writes settle (going offline mid-write drops the entry).
  await page.waitForTimeout(3000);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("get-started")).toBeVisible();
  await page.goto("/?skip#/train");
  await expect(page.getByRole("heading", { name: "Exercise library" })).toBeVisible();
  // The pose runtime and model come from the cache too.
  const ok = await page.evaluate(async () => {
    const names = await caches.keys();
    const keys = (await Promise.all(names.map(async (n) => (await (await caches.open(n)).keys()).map((k) => k.url)))).flat();
    const results: string[] = [];
    for (const u of keys.filter((k) => /\.(task|wasm)$/.test(k))) {
      try {
        results.push(`${(await fetch(u)).status}`);
      } catch (e) {
        results.push(`${u}: ${String(e)} caches=${names.join(",")}`);
      }
    }
    return results.join(" | ");
  });
  console.log(ok);
  expect(ok).toBe("200 | 200");
  await context.setOffline(false);
});
