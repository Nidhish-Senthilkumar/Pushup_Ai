import { earnedAchievements, newRecords, setKcal, workoutXp } from "./progress";
import { getData, saveWorkout, uid, update, type SetRecord, type WorkoutRecord } from "./store";

/**
 * Saves a finished workout with its XP, calories, new personal records and
 * newly unlocked achievements, and returns its id for the summary page.
 */
export function finishWorkout(input: { title: string; kind: WorkoutRecord["kind"]; planId?: string; sets: SetRecord[]; startedAt: number }): string {
  const before = getData();
  const prs: string[] = [];
  // Records are checked set by set against everything before that set.
  let running = before;
  for (const s of input.sets) {
    prs.push(...newRecords(running, s));
    running = { ...running, workouts: [{ id: "tmp", title: "", kind: input.kind, startedAt: 0, endedAt: 0, sets: [s], xp: 0, kcal: 0 }, ...running.workouts] };
  }
  const hadBefore = new Set(earnedAchievements(before).map((a) => a.id));
  const w: WorkoutRecord = {
    id: uid(),
    title: input.title,
    kind: input.kind,
    planId: input.planId,
    startedAt: input.startedAt,
    endedAt: Date.now(),
    sets: input.sets,
    xp: workoutXp(input.sets, input.kind),
    kcal: Math.round(input.sets.reduce((s, x) => s + setKcal(x, before.profile.weightKg), 0) * 10) / 10,
    prs: [...new Set(prs)],
  };
  saveWorkout(w);
  const after = getData();
  w.achievements = earnedAchievements(after)
    .filter((a) => !hadBefore.has(a.id))
    .map((a) => a.id);
  update((d) => ({ ...d, workouts: d.workouts.map((x) => (x.id === w.id ? { ...x, achievements: w.achievements } : x)) }));
  if (input.planId && after.plan) {
    const planId = input.planId;
    update((d) => (d.plan ? { ...d, plan: { ...d.plan, done: [...new Set([...d.plan.done, planId])] } } : d));
  }
  return w.id;
}
