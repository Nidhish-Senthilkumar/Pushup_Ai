import type { Exercise } from "../exercise";
import { bridge, lunge, squat, wallSit } from "./lower";
import { curl, lateralRaise, press, pushup } from "./upper";
import { burpee, highKnees, jumpingJack, plank, situp } from "./core";

/** Every exercise Spotter can coach, in the order the library shows them. */
export const EXERCISES: Exercise[] = [pushup, squat, jumpingJack, plank, lunge, burpee, curl, press, lateralRaise, bridge, situp, highKnees, wallSit];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id);
}

export function exercise(id: string): Exercise {
  const e = byId.get(id);
  if (!e) throw new Error(`Unknown exercise ${id}`);
  return e;
}

export { bridge, burpee, curl, highKnees, jumpingJack, lateralRaise, lunge, plank, press, pushup, situp, squat, wallSit };
