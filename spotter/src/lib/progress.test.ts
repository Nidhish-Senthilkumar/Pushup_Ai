import { describe, expect, it } from "vitest";
import { insights, levelOf, streak, workoutsThisWeek } from "./progress";
import { simulate } from "./sampleData";
import type { Data, WorkoutRecord } from "./store";

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 7, 18, 0).getTime(); // a Wednesday

function data(workouts: WorkoutRecord[]): Data {
  return {
    version: 1,
    profile: { name: "", ageBand: "", sex: "", weightKg: 70, goal: "fitness", onboarded: true },
    settings: { voice: false, sounds: false, countAloud: false, model: "lite", mirror: true, showDebug: false, shareUrl: "", arcadeSeconds: 30, strictness: "standard" },
    workouts,
    arcade: [],
    assessments: [],
    plan: null,
    lab: [],
    customWorkouts: [],
    seenAchievements: [],
  };
}

function workout(daysAgo: number, quality: number, seed: number): WorkoutRecord {
  const s = simulate("squat", 8, quality, seed);
  const startedAt = NOW - daysAgo * DAY;
  return { id: `w${seed}`, title: "t", kind: "single", startedAt, endedAt: startedAt + 60_000, sets: [{ ...s, startedAt }], xp: 50, kcal: 5 };
}

describe("progress", () => {
  it("levels grow quadratically", () => {
    expect(levelOf(0).level).toBe(1);
    expect(levelOf(60).level).toBe(2);
    expect(levelOf(239).level).toBe(2);
    expect(levelOf(240).level).toBe(3);
  });

  it("streak counts consecutive days ending today or yesterday", () => {
    const d = data([workout(0, 1, 1), workout(1, 1, 2), workout(2, 1, 3), workout(5, 1, 4)]);
    expect(streak(d.workouts, NOW)).toBe(3);
    expect(streak([workout(1, 1, 5), workout(2, 1, 6)], NOW)).toBe(2);
    expect(streak([workout(3, 1, 7)], NOW)).toBe(0);
  });

  it("counts this week's workouts from Monday", () => {
    // Wednesday: Monday and today count, last Sunday doesn't.
    const d = data([workout(0, 1, 1), workout(2, 1, 2), workout(3, 1, 3)]);
    expect(workoutsThisWeek(d, NOW)).toBe(2);
  });

  it("insights spot an improving exercise and the most common fault", () => {
    const early = [9, 8, 7].map((ago, i) => workout(ago, 0.35, 10 + i));
    const late = [2, 1, 0].map((ago, i) => workout(ago, 1, 20 + i));
    const list = insights(data([...late, ...early]), NOW);
    const kinds = list.map((x) => x.kind);
    expect(kinds).toContain("improved");
    expect(kinds).toContain("consistency");
    expect(list.find((x) => x.kind === "improved")!.title).toMatch(/Squat/);
  });
});
