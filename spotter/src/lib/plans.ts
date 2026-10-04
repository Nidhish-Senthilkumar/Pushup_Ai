/**
 * Ready-made workouts. Each item is one set: a rep target, or a time (for
 * holds, and for timed circuits where reps are counted for the duration).
 */

export interface PlanItem {
  exerciseId: string;
  reps?: number;
  ms?: number;
  /** Rest after this set. */
  restMs: number;
}

export interface Workout {
  id: string;
  title: string;
  subtitle: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "All levels";
  /** Can be done standing, without getting on the floor (good for a booth or an office). */
  standing?: boolean;
  items: PlanItem[];
  credit?: string;
}

const s = (exerciseId: string, reps: number, restMs = 20000): PlanItem => ({ exerciseId, reps, restMs });
const t = (exerciseId: string, seconds: number, restMs = 15000): PlanItem => ({ exerciseId, ms: seconds * 1000, restMs });

export const WORKOUTS: Workout[] = [
  {
    id: "quick-start",
    title: "Quick Start",
    subtitle: "Five moves, about five minutes. The best first workout.",
    level: "Beginner",
    items: [s("squat", 10), s("pushup", 8), t("jumping-jack", 30), t("plank", 30), s("lunge", 10, 0)],
  },
  {
    id: "desk-break",
    title: "Desk Break",
    subtitle: "Three standing minutes, no floor needed. Great between classes.",
    level: "All levels",
    standing: true,
    items: [s("squat", 12, 15000), s("press", 10, 15000), s("lateral-raise", 10, 15000), t("jumping-jack", 30, 0)],
  },
  {
    id: "seven-minute",
    title: "7-Minute Classic",
    subtitle: "30 seconds on, 10 off: the famous high-intensity circuit.",
    level: "Intermediate",
    credit: "Adapted from Klika and Jordan, ACSM's Health & Fitness Journal, 2013. Step-ups, dips and side planks are swapped for moves Spotter can coach.",
    items: [
      t("jumping-jack", 30, 10000),
      t("wall-sit", 30, 10000),
      t("pushup", 30, 10000),
      t("situp", 30, 10000),
      t("squat", 30, 10000),
      t("plank", 30, 10000),
      t("high-knees", 30, 10000),
      t("lunge", 30, 10000),
      t("pushup", 30, 10000),
      t("bridge", 30, 0),
    ],
  },
  {
    id: "upper",
    title: "Upper Body Builder",
    subtitle: "Push-ups, presses and curls for chest, shoulders and arms.",
    level: "Intermediate",
    items: [s("pushup", 10, 45000), s("pushup", 10, 45000), s("press", 12, 30000), s("curl", 12, 30000), s("lateral-raise", 12, 30000), t("plank", 45, 0)],
  },
  {
    id: "legs",
    title: "Leg Day",
    subtitle: "Squats, lunges and bridges. Wobbly stairs guaranteed.",
    level: "Intermediate",
    items: [s("squat", 15, 40000), s("squat", 15, 40000), s("lunge", 12, 30000), s("bridge", 15, 30000), t("wall-sit", 45, 0)],
  },
  {
    id: "core",
    title: "Core Crusher",
    subtitle: "Sit-ups, planks and bridges for a stronger middle.",
    level: "Intermediate",
    items: [s("situp", 15, 30000), t("plank", 45, 30000), s("bridge", 15, 20000), s("situp", 12, 30000), t("plank", 30, 0)],
  },
  {
    id: "cardio",
    title: "Cardio Blast",
    subtitle: "Jacks, high knees, squats and burpees. Get your heart rate up fast.",
    level: "All levels",
    items: [t("jumping-jack", 40, 15000), t("high-knees", 30, 15000), s("squat", 20, 15000), s("burpee", 8, 20000), t("jumping-jack", 40, 15000), t("high-knees", 30, 0)],
  },
  {
    id: "pushup-ladder",
    title: "Push-up Ladder",
    subtitle: "3, 5, 7, 5, 3. Climb up and back down with perfect form.",
    level: "Advanced",
    items: [s("pushup", 3, 20000), s("pushup", 5, 30000), s("pushup", 7, 40000), s("pushup", 5, 30000), s("pushup", 3, 0)],
  },
];

export function getWorkout(id: string, custom: Workout[] = []): Workout | undefined {
  return WORKOUTS.find((w) => w.id === id) ?? custom.find((w) => w.id === id);
}

/** Rough duration of a workout in minutes, counting about 2.5 s per rep plus rests. */
export function workoutMinutes(w: Workout): number {
  const ms = w.items.reduce((sum, i) => sum + (i.ms ?? (i.reps ?? 10) * 2500) + i.restMs + 8000, 0);
  return Math.max(1, Math.round(ms / 60000));
}

/** One-set workout for a single exercise, for "Train" mode. */
export function singleSet(exerciseId: string, target: { reps?: number; ms?: number }): Workout {
  return { id: `single-${exerciseId}`, title: "", subtitle: "", level: "All levels", items: [{ exerciseId, ...target, restMs: 0 }] };
}
