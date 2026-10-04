import { describe, expect, it } from "vitest";
import { EXERCISES, exercise } from "./exercises";
import { ExerciseSession, type SessionOptions } from "./session";
import { synthesize, type SynthOptions, type View } from "./synthetic";

function run(id: string, o: SynthOptions, so: SessionOptions = {}) {
  const ex = exercise(id);
  const s = new ExerciseSession(ex, so);
  const frames = synthesize(id, o);
  const states = [];
  for (const f of frames) {
    if (!s.started && f.t >= 300) s.begin(f.t);
    states.push(s.push(f));
  }
  return { summary: s.summary(), states, events: s.drain() };
}

const VIEWS: Record<string, View[]> = {
  pushup: ["side", "front"],
  squat: ["side", "front"],
  "jumping-jack": ["front"],
  lunge: ["side"],
  curl: ["front", "side"],
  press: ["front"],
  "lateral-raise": ["front"],
  bridge: ["side"],
  situp: ["side"],
  "high-knees": ["front"],
  burpee: ["side"],
};

describe("synthetic sets: every rep exercise counts clean full-depth reps", () => {
  for (const [id, views] of Object.entries(VIEWS)) {
    for (const view of views) {
      it(`${id} (${view})`, () => {
        const reps = id === "lunge" || id === "high-knees" ? 6 : 5;
        const { summary, states } = run(id, { view, reps, repMs: id === "high-knees" ? 700 : id === "jumping-jack" ? 900 : 2000, restMs: id === "high-knees" ? 50 : 400 });
        const issues = [...new Set(states.flatMap((s) => s.framing.issues))].filter((i) => i !== "get-down" && i !== "stand-up");
        expect({ count: summary.repCount, issues }).toEqual({ count: reps, issues: [] });
        expect(summary.cleanCount).toBe(reps);
        expect(summary.score).toBeGreaterThanOrEqual(90);
      });
    }
  }
});

describe("start position is recognised before the set", () => {
  for (const ex of EXERCISES) {
    it(ex.id, () => {
      const view = (VIEWS[ex.id] ?? ["side"])[0];
      const s = new ExerciseSession(ex);
      const frames = synthesize(ex.id, { view, reps: 1, leadMs: 1500, holdMs: 2000 });
      let ready = false;
      for (const f of frames.filter((f) => f.t < 1400)) ready = s.push(f).ready || ready;
      expect(ready).toBe(true);
    });
  }
});

describe("shallow reps count but are not clean", () => {
  it("push-up at 60% depth", () => {
    const { summary, events } = run("pushup", { reps: 4, depth: 0.62 });
    expect(summary.repCount).toBe(4);
    expect(summary.cleanCount).toBe(0);
    expect(events.some((e) => e.type === "shallow")).toBe(true);
  });
  it("squat at 60% depth", () => {
    const { summary } = run("squat", { view: "front", reps: 4, depth: 0.72 });
    expect(summary.repCount).toBe(4);
    expect(summary.cleanCount).toBe(0);
  });
  it("tiny movements are not reps", () => {
    const { summary } = run("squat", { view: "side", reps: 4, depth: 0.25 });
    expect(summary.repCount).toBe(0);
  });
  it("Arcade form gate only counts clean reps", () => {
    const { summary } = run("squat", { view: "front", reps: 6, depth: (r) => (r % 2 ? 0.6 : 1) }, { formGate: true });
    expect(summary.repCount).toBe(3);
  });
});

describe("faults are caught on the reps that have them", () => {
  it("push-up sagging hips", () => {
    const { summary } = run("pushup", { reps: 4, faults: (r) => (r >= 2 ? { sag: 0.12 } : {}) });
    expect(summary.repCount).toBe(4);
    expect(summary.reps.map((r) => r.faults.includes("hips-sag"))).toEqual([false, false, true, true]);
  });
  it("push-up piked hips", () => {
    const { summary } = run("pushup", { reps: 3, faults: { pike: 0.15 } });
    expect(summary.reps.every((r) => r.faults.includes("hips-high"))).toBe(true);
  });
  it("push-up flared elbows (beta, from the 3D estimate)", () => {
    const { summary } = run("pushup", { reps: 3, faults: { flare: 1 } });
    expect(summary.reps.filter((r) => r.faults.includes("elbows-flare")).length).toBeGreaterThanOrEqual(2);
    const tucked = run("pushup", { reps: 3 });
    expect(tucked.summary.reps.some((r) => r.faults.includes("elbows-flare"))).toBe(false);
  });
  it("knee push-ups still count", () => {
    const { summary } = run("pushup", { reps: 4, faults: { knees: 1 } });
    expect(summary.repCount).toBe(4);
  });
  it("squat knees caving (front view)", () => {
    const { summary } = run("squat", { view: "front", reps: 4, faults: (r) => (r % 2 ? { cave: 1 } : {}) });
    expect(summary.reps.map((r) => r.faults.includes("knees-cave"))).toEqual([false, true, false, true]);
  });
  it("squat chest falling (side view)", () => {
    const { summary } = run("squat", { view: "side", reps: 3, faults: { lean: 35 } });
    expect(summary.reps.every((r) => r.faults.includes("chest-down"))).toBe(true);
    const ok = run("squat", { view: "side", reps: 3 });
    expect(ok.summary.reps.some((r) => r.faults.includes("chest-down"))).toBe(false);
  });
  it("curl elbow drift and swing", () => {
    const drift = run("curl", { view: "side", reps: 3, faults: { drift: 55 } });
    expect(drift.summary.reps.every((r) => r.faults.includes("elbow-drift"))).toBe(true);
    const swing = run("curl", { view: "side", reps: 3, faults: { swing: 22 } });
    expect(swing.summary.reps.every((r) => r.faults.includes("swing"))).toBe(true);
  });
  it("lateral raise too high", () => {
    const { summary } = run("lateral-raise", { view: "front", reps: 3, faults: { high: 1 } });
    expect(summary.reps.every((r) => r.faults.includes("too-high"))).toBe(true);
  });
  it("jumping jacks with lazy arms", () => {
    const { summary } = run("jumping-jack", { view: "front", reps: 4, repMs: 900, faults: { arms: 0.62 } });
    expect(summary.reps.every((r) => r.faults.includes("arms-low"))).toBe(true);
  });
  it("shoulder press with uneven arms", () => {
    const { summary } = run("press", { view: "front", reps: 3, faults: { uneven: 0.6 } });
    expect(summary.reps.every((r) => r.faults.includes("uneven"))).toBe(true);
  });
});

describe("alternating exercises", () => {
  it("alternating curls count each arm", () => {
    const { summary } = run("curl", { view: "front", reps: 6, together: false });
    expect(summary.repCount).toBe(6);
    expect(summary.reps.map((r) => r.side)).toEqual(["left", "right", "left", "right", "left", "right"]);
  });
  it("two-arm curls count once per rep", () => {
    const { summary } = run("curl", { view: "front", reps: 5, together: true });
    expect(summary.repCount).toBe(5);
  });
  it("fast high knees count every knee", () => {
    const { summary } = run("high-knees", { view: "front", reps: 20, repMs: 450, restMs: 0 });
    expect(summary.repCount).toBe(20);
  });
});

describe("holds", () => {
  it("plank in good form", () => {
    const { summary } = run("plank", { holdMs: 10000 });
    expect(summary.holdMs).toBeGreaterThan(9000);
    expect(summary.score).toBeGreaterThanOrEqual(95);
  });
  it("plank sagging half the time", () => {
    const { summary } = run("plank", { holdMs: 10000, faults: (sec) => (sec >= 5 ? { sag: 0.12 } : {}) });
    expect(summary.holdMs).toBeGreaterThan(9000);
    expect(summary.score).toBeGreaterThan(35);
    expect(summary.score).toBeLessThan(65);
    expect(summary.faultCounts["hips-sag"]).toBeGreaterThanOrEqual(3);
  });
  it("wall sit too high", () => {
    const good = run("wall-sit", { holdMs: 8000 });
    expect(good.summary.score).toBeGreaterThanOrEqual(95);
    const high = run("wall-sit", { holdMs: 8000, faults: { high: 0.7 } });
    expect(high.summary.score).toBeLessThan(20);
  });
});

describe("robustness", () => {
  it("noisy landmarks (4 px) don't add or drop reps", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { summary } = run("squat", { view: "front", reps: 8, noisePx: 4, seed });
      expect(summary.repCount).toBe(8);
    }
  });
  it("a slow 12 fps camera still counts", () => {
    const { summary } = run("pushup", { reps: 6, fps: 12 });
    expect(summary.repCount).toBe(6);
  });
  it("fast push-ups are flagged as rushed", () => {
    const { summary } = run("pushup", { reps: 4, repMs: 650, restMs: 50 });
    expect(summary.repCount).toBe(4);
    expect(summary.reps.every((r) => r.rushed)).toBe(true);
  });
  it("pauses when the person leaves", () => {
    const ex = exercise("squat");
    const s = new ExerciseSession(ex);
    const frames = synthesize("squat", { view: "front", reps: 2 });
    s.begin(0);
    for (const f of frames) s.push(f);
    const t = frames[frames.length - 1]!.t;
    for (let k = 1; k < 80; k++) s.push({ t: t + k * 33, width: 1280, height: 720, landmarks: [] });
    expect(s.drain().some((e) => e.type === "lost")).toBe(true);
  });
});

describe("who to coach when several people are in view", () => {
  /** Puts a second person in every frame: a bigger bystander standing still, nearer the camera. */
  function withBystander(id: string, view: "front" | "side", reps: number) {
    const doer = synthesize(id, { view, reps, width: 1280, height: 720 });
    const still = synthesize("squat", { view: "front", reps: 0, leadMs: doer[doer.length - 1]!.t + 100, tailMs: 0, seed: 99 });
    return doer.map((f, i) => {
      const b = still[Math.min(i, still.length - 1)]!;
      // The bystander: scaled up 1.3x and moved to the left half of the picture.
      const big = b.landmarks.map((p) => ({ ...p, x: (p.x - 640) * 1.3 + 300, y: (p.y - 360) * 1.3 + 360 }));
      const small = f.landmarks.map((p) => ({ ...p, x: (p.x - 640) * 0.6 + 950, y: (p.y - 360) * 0.6 + 400 }));
      return { ...f, landmarks: big, world: b.world, people: 2, candidates: [{ landmarks: big, world: b.world }, { landmarks: small, world: f.world }] };
    });
  }
  it("follows the person doing the exercise, not the biggest one", () => {
    const s = new ExerciseSession(exercise("squat"));
    s.begin(0);
    for (const f of withBystander("squat", "front", 6)) s.push(f);
    expect(s.summary().repCount).toBeGreaterThanOrEqual(5);
  });
  it("a rep already under way when the person is picked still counts", () => {
    const s = new ExerciseSession(exercise("curl"));
    s.begin(0);
    for (const f of withBystander("curl", "front", 4)) s.push(f);
    expect(s.summary().repCount).toBe(4);
  });
});

describe("a rep only starts from the start position", () => {
  it("someone already at the bottom when the set starts isn't credited with a rep", () => {
    const frames = synthesize("squat", { view: "front", reps: 2 });
    // Start the set in the middle of the first squat, at its deepest point.
    const startAt = 1500 + 0.5 * 2000;
    const s = new ExerciseSession(exercise("squat"));
    for (const f of frames) {
      if (f.t < startAt) continue;
      if (!s.started) s.begin(f.t);
      s.push(f);
    }
    expect(s.summary().repCount).toBe(1);
  });
});

describe("push-ups filmed head-on", () => {
  it("count, with no body-line faults (the line can't be seen from the front)", () => {
    const { summary } = run("pushup", { view: "front", reps: 4, faults: { sag: 0.12 } });
    expect(summary.repCount).toBe(4);
    expect(summary.reps.some((r) => r.faults.includes("hips-sag") || r.faults.includes("hips-high"))).toBe(false);
  });
});

describe("form strictness", () => {
  it("easy counts a three-quarter-depth squat as clean; standard and strict don't", () => {
    const o = { view: "front" as const, reps: 4, depth: 0.8 };
    expect(run("squat", o, { strictness: "easy" }).summary.cleanCount).toBe(4);
    expect(run("squat", o, { strictness: "standard" }).summary.cleanCount).toBe(0);
    expect(run("squat", o, { strictness: "strict" }).summary.cleanCount).toBe(0);
  });
  it("strict asks for more than standard", () => {
    const o = { view: "front" as const, reps: 3, depth: 0.87 };
    expect(run("squat", o, { strictness: "standard" }).summary.cleanCount).toBe(3);
    expect(run("squat", o, { strictness: "strict" }).summary.cleanCount).toBeLessThan(3);
  });
});

describe("burpees", () => {
  it("a burpee that doesn't reach a full plank counts but isn't clean", () => {
    const { summary } = run("burpee", { reps: 3, repMs: 3000, faults: { short: 0.5 } });
    expect(summary.repCount).toBe(3);
    expect(summary.cleanCount).toBe(0);
  });
});

