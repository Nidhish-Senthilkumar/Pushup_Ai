import { describe, expect, it } from "vitest";
import { simulate } from "./sampleData";

describe("sample history", () => {
  it("a good plank holds most of the time in good form", () => {
    const s = simulate("plank", 0, 0.9, 3);
    expect(s.holdMs).toBeGreaterThan(30000);
    expect(s.score).toBeGreaterThan(60);
  });
  it("a middling set has some faults and some clean reps", () => {
    const s = simulate("squat", 12, 0.6, 5);
    expect(s.repCount).toBeGreaterThanOrEqual(10);
    expect(s.cleanCount).toBeLessThan(s.repCount);
    expect(s.cleanCount).toBeGreaterThan(0);
  });
});
