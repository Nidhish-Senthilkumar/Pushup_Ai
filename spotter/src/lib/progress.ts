import { EXERCISES, getExercise } from "../engine/exercises";
import type { SetSummary } from "../engine/session";
import type { Data, SetRecord, WorkoutRecord } from "./store";

/** XP, levels, streaks, personal records and achievements, all derived from the saved history. */

export function setXp(s: SetSummary): number {
  if (s.kind === "hold") return Math.round(s.goodHoldMs / 1000) * 2 + Math.round((s.holdMs - s.goodHoldMs) / 1000) + (s.holdMs >= 10000 ? 20 : 0);
  return s.cleanCount * 10 + (s.reps.length - s.cleanCount) * 4 + (s.reps.length >= 3 ? 20 : 0);
}

export function workoutXp(sets: SetSummary[], kind: WorkoutRecord["kind"]): number {
  const base = sets.reduce((sum, s) => sum + setXp(s), 0);
  return base + (kind === "plan" && sets.length >= 3 ? 50 : 0) + (kind === "assessment" ? 75 : 0);
}

/** Calories from MET values: rough by nature, and labelled as an estimate everywhere it's shown. */
export function setKcal(s: SetSummary, weightKg: number): number {
  const ex = getExercise(s.exerciseId);
  const met = ex?.met ?? 4;
  const hours = Math.max(s.durationMs, s.holdMs) / 3_600_000;
  return met * (weightKg || 70) * hours;
}

export function totalXp(d: Data): number {
  return d.workouts.reduce((sum, w) => sum + w.xp, 0);
}

/** Level n starts at 60 * (n - 1)^2 XP: quick early levels, slower later. */
export function levelOf(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 60)) + 1;
  const start = 60 * (level - 1) ** 2;
  const end = 60 * level ** 2;
  return { level, into: xp - start, span: end - start, progress: (xp - start) / (end - start) };
}

export const LEVEL_TITLES = ["Rookie", "Mover", "Regular", "Athlete", "Grinder", "Machine", "Beast", "Titan", "Legend", "Mythic"];

export function levelTitle(level: number) {
  return LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 2))] ?? "Rookie";
}

const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** Consecutive days with at least one workout, ending today or yesterday. */
export function streak(workouts: WorkoutRecord[], now = Date.now()): number {
  const days = new Set(workouts.map((w) => dayKey(w.startedAt)));
  let n = 0;
  const d = new Date(now);
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d.getTime()))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function allSets(d: Data): (SetRecord & { workoutId: string })[] {
  return d.workouts.flatMap((w) => w.sets.map((s) => ({ ...s, workoutId: w.id })));
}

export interface Totals {
  reps: number;
  cleanReps: number;
  holdMs: number;
  workouts: number;
  sets: number;
  minutes: number;
  kcal: number;
  exercises: number;
  formScore: number;
}

export function totals(d: Data): Totals {
  const sets = allSets(d);
  const reps = sets.reduce((s, x) => s + x.reps.length, 0);
  const scored = sets.filter((s) => (s.kind === "reps" ? s.reps.length > 0 : s.holdMs > 0));
  return {
    reps,
    cleanReps: sets.reduce((s, x) => s + x.cleanCount, 0),
    holdMs: sets.reduce((s, x) => s + x.holdMs, 0),
    workouts: d.workouts.length,
    sets: sets.length,
    minutes: Math.round(d.workouts.reduce((s, w) => s + (w.endedAt - w.startedAt), 0) / 60000),
    kcal: Math.round(d.workouts.reduce((s, w) => s + w.kcal, 0)),
    exercises: new Set(sets.map((s) => s.exerciseId)).size,
    formScore: scored.length ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length) : 0,
  };
}

export interface Record_ {
  exerciseId: string;
  bestReps: number;
  bestClean: number;
  bestScore: number;
  longestHoldMs: number;
  bestGoodHoldMs: number;
}

export function records(d: Data): Map<string, Record_> {
  const m = new Map<string, Record_>();
  for (const s of allSets(d)) {
    const r = m.get(s.exerciseId) ?? { exerciseId: s.exerciseId, bestReps: 0, bestClean: 0, bestScore: 0, longestHoldMs: 0, bestGoodHoldMs: 0 };
    r.bestReps = Math.max(r.bestReps, s.reps.length);
    r.bestClean = Math.max(r.bestClean, s.cleanCount);
    if (s.reps.length >= 5 || s.holdMs >= 15000) r.bestScore = Math.max(r.bestScore, s.score);
    r.longestHoldMs = Math.max(r.longestHoldMs, s.holdMs);
    r.bestGoodHoldMs = Math.max(r.bestGoodHoldMs, s.goodHoldMs);
    m.set(s.exerciseId, r);
  }
  return m;
}

/** Personal records this set beat, compared with the history before it. */
export function newRecords(before: Data, s: SetSummary): string[] {
  const prev = records(before).get(s.exerciseId);
  const name = getExercise(s.exerciseId)?.name ?? s.exerciseId;
  const out: string[] = [];
  if (!prev) return s.reps.length || s.holdMs ? [`First ${name.toLowerCase()} set logged`] : [];
  if (s.kind === "reps") {
    if (s.cleanCount > prev.bestClean && s.cleanCount >= 3) out.push(`Most clean ${name.toLowerCase()}s: ${s.cleanCount}`);
    else if (s.reps.length > prev.bestReps && s.reps.length >= 3) out.push(`Most ${name.toLowerCase()}s in a set: ${s.reps.length}`);
    if (s.reps.length >= 5 && s.score > prev.bestScore && prev.bestScore > 0) out.push(`Best ${name.toLowerCase()} form: ${s.score}`);
  } else if (s.goodHoldMs > prev.bestGoodHoldMs && s.goodHoldMs >= 5000) {
    out.push(`Longest good-form ${name.toLowerCase()}: ${Math.round(s.goodHoldMs / 1000)} s`);
  }
  return out;
}

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  icon: string;
  earned: (d: Data) => boolean;
}

const sets = (d: Data) => allSets(d);

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first", title: "First Rep", detail: "Finish your first set", icon: "spark", earned: (d) => sets(d).some((s) => s.reps.length > 0 || s.holdMs > 5000) },
  { id: "perfect10", title: "Perfect Ten", detail: "10 clean reps in one set", icon: "target", earned: (d) => sets(d).some((s) => s.cleanCount >= 10) },
  { id: "flawless", title: "Flawless", detail: "A set of 8+ reps scoring 95 or more", icon: "diamond", earned: (d) => sets(d).some((s) => s.reps.length >= 8 && s.score >= 95) },
  { id: "century", title: "Century", detail: "100 reps in total", icon: "hundred", earned: (d) => totals(d).reps >= 100 },
  { id: "thousand", title: "Thousand Club", detail: "1,000 reps in total", icon: "crown", earned: (d) => totals(d).reps >= 1000 },
  { id: "iron-core", title: "Iron Core", detail: "60 seconds of good-form plank", icon: "shield", earned: (d) => sets(d).some((s) => s.exerciseId === "plank" && s.goodHoldMs >= 60000) },
  { id: "streak3", title: "On a Roll", detail: "Work out 3 days in a row", icon: "flame", earned: (d) => streak(d.workouts) >= 3 },
  { id: "streak7", title: "Week Warrior", detail: "Work out 7 days in a row", icon: "flame", earned: (d) => streak(d.workouts) >= 7 },
  { id: "explorer", title: "Explorer", detail: "Try 6 different exercises", icon: "compass", earned: (d) => totals(d).exercises >= 6 },
  { id: "all", title: "Completionist", detail: "Try every exercise", icon: "medal", earned: (d) => totals(d).exercises >= EXERCISES.length },
  { id: "plan", title: "Committed", detail: "Finish a full guided workout", icon: "check", earned: (d) => d.workouts.some((w) => w.kind === "plan") },
  { id: "benchmark", title: "Benchmarked", detail: "Take the fitness test", icon: "chart", earned: (d) => d.assessments.length > 0 },
  { id: "arcade", title: "Arcade Hero", detail: "Play an Arcade challenge", icon: "joystick", earned: (d) => d.arcade.length > 0 },
  { id: "early", title: "Early Bird", detail: "Work out before 7 am", icon: "sun", earned: (d) => d.workouts.some((w) => new Date(w.startedAt).getHours() < 7) },
  { id: "night", title: "Night Owl", detail: "Work out after 10 pm", icon: "moon", earned: (d) => d.workouts.some((w) => new Date(w.startedAt).getHours() >= 22) },
];

export function earnedAchievements(d: Data): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.earned(d));
}

/** Reps per day for the last `days` days, oldest first. */
export function dailyReps(d: Data, days: number, now = Date.now()): { day: Date; reps: number; workouts: number }[] {
  const out: { day: Date; reps: number; workouts: number }[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    out.push({ day, reps: 0, workouts: 0 });
  }
  for (const w of d.workouts) {
    const idx = Math.floor((new Date(w.startedAt).setHours(0, 0, 0, 0) - start.getTime()) / 86_400_000 + 0.5);
    const slot = out[idx];
    if (slot) {
      slot.workouts += 1;
      slot.reps += w.sets.reduce((s, x) => s + x.reps.length + Math.round(x.holdMs / 3000), 0);
    }
  }
  return out;
}

export interface Insight {
  kind: "improved" | "fault" | "consistency" | "next";
  title: string;
  text: string;
}

/**
 * Plain-language insights from the whole history: what's improving, the most
 * common fault and how to fix it, and how consistent training has been.
 */
export function insights(d: Data, now = Date.now()): Insight[] {
  const out: Insight[] = [];
  const sets = allSets(d).sort((a, b) => a.startedAt - b.startedAt);
  if (sets.length < 3) return out;

  // Most improved: average form score of the first three sets vs the last three, per exercise.
  let best: { name: string; from: number; to: number } | null = null;
  const byEx = new Map<string, typeof sets>();
  for (const s of sets) if (s.reps.length >= 3 || s.holdMs >= 10000) byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), s]);
  for (const [id, list] of byEx) {
    if (list.length < 4) continue;
    const k = Math.min(3, Math.floor(list.length / 2));
    const avg = (xs: typeof list) => xs.reduce((s, x) => s + x.score, 0) / xs.length;
    const from = avg(list.slice(0, k));
    const to = avg(list.slice(-k));
    if (to - from >= 5 && (!best || to - from > best.to - best.from)) best = { name: getExercise(id)?.name ?? id, from, to };
  }
  if (best) out.push({ kind: "improved", title: `${best.name} is improving`, text: `Your form score went from ${Math.round(best.from)} to ${Math.round(best.to)} between your first and latest sets.` });

  // Most common fault across all reps.
  const counts = new Map<string, { n: number; ex: string }>();
  let reps = 0;
  for (const s of sets) {
    reps += s.reps.length;
    for (const [id, n] of Object.entries(s.faultCounts)) {
      const ex = getExercise(s.exerciseId);
      const c = ex?.checks.find((x) => x.id === id);
      if (!c || c.beta) continue;
      const key = `${s.exerciseId}:${id}`;
      counts.set(key, { n: (counts.get(key)?.n ?? 0) + n, ex: s.exerciseId });
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  if (top) {
    const [key, { n, ex }] = top;
    const e = getExercise(ex);
    const c = e?.checks.find((x) => x.id === key.split(":")[1]);
    if (e && c) out.push({ kind: "fault", title: `Most common fix: ${c.title.toLowerCase()} (${e.name.toLowerCase()})`, text: `${n} time${n === 1 ? "" : "s"} so far. ${c.tip}` });
  }

  // Consistency over the last four weeks.
  const fourWeeks = d.workouts.filter((w) => now - w.startedAt <= 28 * 86_400_000).length;
  const perWeek = fourWeeks / 4;
  out.push({
    kind: "consistency",
    title: perWeek >= 3 ? "Great consistency" : perWeek >= 1.5 ? "Building a habit" : "Room to be more consistent",
    text: `${fourWeeks} workout${fourWeeks === 1 ? "" : "s"} in the last 4 weeks (${perWeek.toFixed(1)} a week). ${perWeek >= 3 ? "That's the range where strength builds steadily." : "Three short sessions a week beats one long one."}`,
  });

  // What to try next: an exercise not done yet.
  const tried = new Set(sets.map((s) => s.exerciseId));
  const untried = ["squat", "pushup", "plank", "lunge", "jumping-jack", "burpee", "bridge", "curl", "press", "situp", "lateral-raise", "high-knees", "wall-sit"].find((id) => !tried.has(id));
  if (untried) out.push({ kind: "next", title: `Try ${getExercise(untried)?.name.toLowerCase()} next`, text: getExercise(untried)?.blurb ?? "" });
  return out;
}

/** Workouts so far this week (Monday to Sunday). */
export function workoutsThisWeek(d: Data, now = Date.now()): number {
  const start = new Date(now);
  const day = (start.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day);
  return d.workouts.filter((w) => w.startedAt >= start.getTime()).length;
}
