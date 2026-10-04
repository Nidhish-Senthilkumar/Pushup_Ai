import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scoreFrames } from "./replay";
import type { PoseFrame } from "./types";

/**
 * Replays pose traces of real, openly licensed exercise videos through the
 * engine and compares the count with a hand count. Traces come from
 * e2e/traceClip.spec.ts (the real pose model in real Chrome); without them
 * these tests skip. Truth and the counting rule: scripts/validation/truth.json.
 */
const ROOT = path.resolve(__dirname, "../..");
const truth = JSON.parse(readFileSync(path.join(ROOT, "scripts/validation/truth.json"), "utf8")) as {
  clips: { clip: string; exercise: string; view: string; truth: number; knownMiss?: string }[];
  stress: { clip: string; exercise: string; view: string; truth: number; knownMiss?: string }[];
};

const results: { clip: string; truth: number; counted: number; clean: number; score: number; faults: string }[] = [];

describe("real footage", () => {
  for (const c of [...truth.clips, ...truth.stress]) {
    const file = path.join(ROOT, "e2e/.cache/traces", `${c.clip}.json`);
    // Known misses are recorded, not hidden: it.fails keeps the suite green and
    // turns red if the clip ever starts matching, so the docs get updated.
    const name = `${c.clip}: ${c.truth} ${c.exercise} reps${c.knownMiss ? " (known miss)" : ""}`;
    if (!existsSync(file)) {
      it.skip(name, () => {});
      continue;
    }
    (c.knownMiss ? it.fails : it)(name, () => {
      const frames = JSON.parse(readFileSync(file, "utf8")) as PoseFrame[];
      const s = scoreFrames(c.exercise, frames);
      results.push({ clip: c.clip, truth: c.truth, counted: s.repCount, clean: s.cleanCount, score: s.score, faults: Object.entries(s.faultCounts).map(([k, v]) => `${k}:${v}`).join(" ") });
      expect(s.repCount).toBe(c.truth);
    });
  }
  it("summary", () => {
    if (results.length) console.table(results);
  });
});
