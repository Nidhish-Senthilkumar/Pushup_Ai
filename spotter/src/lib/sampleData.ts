import { exercise } from "../engine/exercises";
import { ExerciseSession, type SetSummary } from "../engine/session";
import { synthesize, type View } from "../engine/synthetic";
import { workoutXp } from "./progress";
import { getData, replaceData, uid, type WorkoutRecord } from "./store";

/**
 * Sample history for demonstrating the Progress pages (at a booth, nobody
 * has three weeks of history yet). Every set is produced the honest way: a
 * synthetic skeleton performs it and the real engine scores it. Sample
 * workouts are tagged so they can be removed in one tap.
 */

const VIEW: Record<string, View> = { squat: "front", "jumping-jack": "front", curl: "front", press: "front", "lateral-raise": "front", "high-knees": "front" };

export function simulate(id: string, reps: number, quality: number, seed: number): SetSummary {
  const ex = exercise(id);
  const s = new ExerciseSession(ex);
  const rand = mulberry(seed);
  const memo = <T,>(f: (r: number) => T) => {
    const m = new Map<number, T>();
    return (r: number) => {
      if (!m.has(r)) m.set(r, f(r));
      return m.get(r) as T;
    };
  };
  const late = (r: number) => (reps ? r / reps : r / 40);
  const shallow = memo((r) => (rand() < (1 - quality) * (0.3 + late(r)) ? 0.72 : 1));
  const faulty = memo((r) => rand() < (1 - quality) * 0.7 * (late(r) + 0.3));
  const frames = synthesize(id, {
    view: VIEW[id] ?? "side",
    reps,
    seed,
    holdMs: 20000 + quality * 40000,
    // Lower quality: some shallow reps and some faulty ones, more of them
    // later in the set (fatigue). Decided once per rep (for holds, once per
    // second), so a fault lasts the whole rep like a real one would.
    depth: (r) => shallow(r),
    faults: (r) => (faulty(r) ? { sag: 0.12, cave: 1, lean: 35, drift: 55, high: 0.6 } : {}),
    noisePx: 2,
  });
  for (const f of frames) {
    if (!s.started && f.t >= 300) s.begin(f.t);
    s.push(f);
  }
  return s.summary();
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function loadSampleHistory() {
  const now = Date.now();
  const workouts: WorkoutRecord[] = [];
  const plan: [string, number][][] = [
    [["squat", 10], ["pushup", 6], ["plank", 0]],
    [["jumping-jack", 20], ["lunge", 10]],
    [["pushup", 8], ["curl", 10], ["press", 10]],
    [["squat", 12], ["bridge", 12], ["plank", 0]],
    [["pushup", 9], ["situp", 12]],
    [["squat", 15], ["lunge", 12], ["wall-sit", 0]],
    [["pushup", 10], ["press", 12], ["plank", 0]],
  ];
  let seed = 11;
  for (let day = 20; day >= 1; day--) {
    if (day % 3 === 1 && day > 4) continue; // rest days
    const progress = 1 - day / 22;
    const items = plan[day % plan.length]!;
    const start = now - day * 86_400_000 + (17 + (day % 4)) * 3_600_000 - (new Date(now).getHours() * 3_600_000);
    const sets = items.map(([id, reps]) => {
      const s = simulate(id, Math.round(reps * (0.7 + 0.5 * progress)), 0.5 + 0.35 * progress, seed++);
      return { ...s, startedAt: start, target: reps ? { reps: Math.round(reps * (0.7 + 0.5 * progress)) } : { ms: 30000 } };
    });
    workouts.push({
      id: `sample-${uid()}`,
      title: `Sample: ${items.map(([id]) => exercise(id).name).join(", ")}`,
      kind: "plan",
      startedAt: start,
      endedAt: start + 9 * 60_000,
      sets,
      xp: workoutXp(sets, "plan"),
      kcal: 35 + (day % 5) * 6,
    });
  }
  const d = getData();
  replaceData({ ...d, workouts: [...d.workouts.filter((w) => !w.id.startsWith("sample-")), ...workouts].sort((a, b) => b.startedAt - a.startedAt) });
}

export function clearSampleHistory() {
  const d = getData();
  replaceData({ ...d, workouts: d.workouts.filter((w) => !w.id.startsWith("sample-")) });
}

export function hasSampleHistory() {
  return getData().workouts.some((w) => w.id.startsWith("sample-"));
}
