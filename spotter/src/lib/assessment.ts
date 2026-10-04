import type { Profile } from "./store";
import type { PlanItem, Workout } from "./plans";

/**
 * The fitness test: max push-ups, max squats in 60 seconds, and the longest
 * good-form plank. Push-ups are rated against published norms; squats and
 * planks against Spotter's own bands, which are general guidance and labelled
 * that way in the app.
 */

export const RATINGS = ["Needs improvement", "Fair", "Good", "Very good", "Excellent"] as const;
export type Rating = (typeof RATINGS)[number];

type Band = "under20" | "20-29" | "30-39" | "40-49" | "50-59" | "60+";

/**
 * Push-up norms from the Canadian Physical Activity, Fitness & Lifestyle
 * Approach (CSEP, 2003), the table ACSM's Guidelines for Exercise Testing and
 * Prescription reproduces. Lower bound for Fair, Good, Very good, Excellent.
 * Men do full push-ups; women's norms are for push-ups from the knees.
 */
export const PUSHUP_NORMS: Record<"male" | "female", Record<Band, [number, number, number, number]>> = {
  male: {
    under20: [18, 23, 29, 39],
    "20-29": [17, 22, 29, 36],
    "30-39": [12, 17, 22, 30],
    "40-49": [10, 13, 17, 25],
    "50-59": [7, 10, 13, 21],
    "60+": [5, 8, 11, 18],
  },
  female: {
    under20: [12, 18, 25, 33],
    "20-29": [10, 15, 21, 30],
    "30-39": [8, 13, 20, 27],
    "40-49": [5, 11, 15, 24],
    "50-59": [2, 7, 11, 21],
    "60+": [2, 5, 12, 17],
  },
};

export const PUSHUP_SOURCE =
  "Push-up ratings: Canadian Physical Activity, Fitness & Lifestyle Approach (CSEP, 2003), as reproduced in ACSM's Guidelines for Exercise Testing and Prescription. Men's norms use full push-ups, women's use knee push-ups.";

/** Spotter's own bands for 60 seconds of squats and the good-form plank. General guidance, not clinical norms. */
const SQUAT_BANDS: [number, number, number, number] = [15, 25, 35, 45];
const PLANK_BANDS_S: [number, number, number, number] = [20, 45, 75, 120];

export const OWN_BANDS_NOTE = "Squat and plank ratings are Spotter's own guidance bands, not clinical norms.";

function rate(value: number, lows: [number, number, number, number]): Rating {
  let i = 0;
  while (i < 4 && value >= lows[i]!) i++;
  return RATINGS[i]!;
}

export function pushupRating(reps: number, p: Pick<Profile, "ageBand" | "sex">): Rating {
  const band: Band = (p.ageBand || "20-29") as Band;
  if (p.sex === "male" || p.sex === "female") return rate(reps, PUSHUP_NORMS[p.sex][band]);
  // Not given: average the two tables.
  const m = PUSHUP_NORMS.male[band];
  const f = PUSHUP_NORMS.female[band];
  return rate(reps, m.map((v, i) => Math.round((v + f[i]!) / 2)) as [number, number, number, number]);
}

export const squatRating = (reps: number) => rate(reps, SQUAT_BANDS);
export const plankRating = (ms: number) => rate(ms / 1000, PLANK_BANDS_S);

export const ratingScore = (r: Rating) => RATINGS.indexOf(r);

export function overall(ratings: Rating[]): Rating {
  if (!ratings.length) return "Fair";
  const avg = ratings.reduce((s, r) => s + ratingScore(r), 0) / ratings.length;
  return RATINGS[Math.round(avg)]!;
}

/**
 * A 4-week, 3-days-a-week plan built from the test. Working sets sit at about
 * half of each max, rising 10% a week, which is the classic way to build
 * endurance without grinding reps to failure.
 */
export function buildPlan(result: { pushups: number | null; squats: number | null; plankMs: number | null }): Workout[] {
  const push = Math.max(3, result.pushups ?? 6);
  const squat = Math.max(6, result.squats ?? 15);
  const plankS = Math.max(15, Math.round((result.plankMs ?? 30000) / 1000));
  const days: Workout[] = [];
  for (let w = 1; w <= 4; w++) {
    const k = 1 + 0.1 * (w - 1);
    const r = (max: number, frac: number) => Math.max(3, Math.round(max * frac * k));
    const hold = (frac: number) => Math.max(15, Math.round((plankS * frac * k) / 5) * 5) * 1000;
    const A: PlanItem[] = [
      { exerciseId: "pushup", reps: r(push, 0.5), restMs: 60000 },
      { exerciseId: "pushup", reps: r(push, 0.5), restMs: 60000 },
      { exerciseId: "press", reps: 12, restMs: 30000 },
      { exerciseId: "plank", ms: hold(0.6), restMs: 0 },
    ];
    const B: PlanItem[] = [
      { exerciseId: "squat", reps: r(squat, 0.5), restMs: 45000 },
      { exerciseId: "lunge", reps: r(squat, 0.4), restMs: 45000 },
      { exerciseId: "bridge", reps: 15, restMs: 30000 },
      { exerciseId: "wall-sit", ms: hold(0.5), restMs: 0 },
    ];
    const C: PlanItem[] = [
      { exerciseId: "jumping-jack", ms: 30000, restMs: 15000 },
      { exerciseId: "squat", reps: r(squat, 0.4), restMs: 30000 },
      { exerciseId: "pushup", reps: r(push, 0.4), restMs: 30000 },
      { exerciseId: "situp", reps: 12, restMs: 30000 },
      { exerciseId: "plank", ms: hold(0.5), restMs: 0 },
    ];
    const label = ["Upper body", "Lower body", "Full body"];
    [A, B, C].forEach((items, d) =>
      days.push({
        id: `w${w}d${d + 1}`,
        title: `Week ${w} · Day ${d + 1}`,
        subtitle: label[d]!,
        level: "All levels",
        items,
      }),
    );
  }
  return days;
}
