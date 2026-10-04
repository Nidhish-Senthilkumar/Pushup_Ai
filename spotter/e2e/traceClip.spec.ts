import { test } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Validation helper, not a pass/fail test: runs clips through the Analyze
 * page (the real pose model in real Chrome) and saves every frame's landmarks
 * to e2e/.cache/traces/<clip>.json, so the engine can be replayed on them
 * offline in seconds (src/engine/realClips.eval.test.ts).
 *
 *   TRACE_CLIPS=pushup-side.webm:pushup,squat-front.webm:squat npx playwright test traceClip --project=chrome
 *   (an optional third field analyses at that frame rate: pushup-side-12fps.webm:pushup:12)
 */
const HERE = path.dirname(new URL(import.meta.url).pathname);
const clips = (process.env.TRACE_CLIPS ?? "").split(",").filter(Boolean);

test.skip(clips.length === 0, "set TRACE_CLIPS to trace clips");

for (const spec of clips) {
  const [clip, exerciseId = "pushup", fps] = spec.split(":");
  test(`trace ${clip}`, async ({ page }) => {
    test.setTimeout(900_000);
    const file = path.join(HERE, ".cache", "clips", clip!);
    test.skip(!existsSync(file), `missing ${clip}`);
    await page.goto(`/#/analyze${fps ? `?fps=${fps}` : ""}`);
    await page.getByTestId("analyze-exercise").selectOption(exerciseId);
    await page.getByTestId("analyze-file").setInputFiles(file);
    await page.getByTestId("analyze-run").click();
    await page.getByTestId("analyze-result").waitFor({ timeout: 880_000 });
    const frames = await page.evaluate(() => window.__spotterTrace ?? []);
    const count = await page.getByTestId("analyze-count").textContent();
    const out = path.join(HERE, ".cache", "traces", clip!.replace(/\.\w+$/, ".json"));
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(frames));
    console.log(`${clip} (${exerciseId}): ${frames.length} frames, ${count} -> ${out}`);
  });
}
