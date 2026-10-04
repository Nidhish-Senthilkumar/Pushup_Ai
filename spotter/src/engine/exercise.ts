import type { Body } from "./body";

/**
 * How an exercise is described to the engine. Every exercise is data plus a
 * few small functions: what to measure on a frame, how far through a rep that
 * measurement is, and which form faults to watch for. The engine (session.ts)
 * does the rest the same way for all of them: counting, timing, scoring,
 * cueing and summarising.
 */

/** Named numbers measured on one frame. `p` is rep progress: 0 at the start position, 1 at full depth. */
export type Metrics = Record<string, number> & { p: number };

export type Category = "upper" | "lower" | "core" | "cardio";
export type CameraView = "side" | "front" | "any";
export type Posture = "standing" | "lying" | "any";

/** Per-metric summary of one rep (or one hold), handed to rep-level checks and to scoring. */
export interface RepAggregate {
  min: Record<string, number>;
  max: Record<string, number>;
  mean: Record<string, number>;
  /** Metrics at the deepest point of the rep. */
  atPeak: Record<string, number>;
  /** Deepest progress reached (1 = full depth). */
  peak: number;
  durationMs: number;
  /** Start of the rep to the deepest point. */
  downMs: number;
  /** Deepest point back to the start position. */
  upMs: number;
  /** Which side was measured, for exercises that alternate sides. */
  side?: "left" | "right";
}

export interface FormCheck {
  id: string;
  /** Short name for the fault, shown in summaries: "Hips sagging". */
  title: string;
  /** What to do about it, said live: "Lift your hips". Keep it under five words. */
  cue: string;
  /** One or two sentences for the summary: why it matters and how to fix it. */
  tip: string;
  /** Landmarks to light up red while the fault is happening. */
  joints: number[];
  /** Major faults make a rep not clean (and not counted in Arcade). Minor ones only cost points. */
  major: boolean;
  /**
   * `live`: checked on every frame during a rep or hold; the fault fires once
   * it has lasted `holdMs`. `rep`: checked once when a rep ends, on its aggregate.
   */
  kind: "live" | "rep";
  live?: (m: Metrics) => boolean | null;
  holdMs?: number;
  rep?: (r: RepAggregate) => boolean;
  /** Beta checks are shown but don't change scores, because they haven't been validated on real footage. */
  beta?: boolean;
}

export interface SetupSpec {
  view: CameraView;
  posture: Posture;
  /**
   * Landmark groups that must be visible. Each entry is a list of
   * alternatives: one fully visible alternative satisfies it. Side views list
   * a left and a right alternative.
   */
  required: number[][][];
  /** Where to put the camera, shown before the set starts. */
  placement: string;
  /** The position to hold so the set can start hands-free. */
  startPose: (m: Metrics, body: Body) => boolean;
  startHint: string;
  /** Shown during setup when the camera works but a different view would give fuller feedback. */
  viewTip?: { when: "front" | "side"; text: string };
}

interface BaseExercise {
  id: string;
  name: string;
  category: Category;
  /** Muscles worked, for the library and the body map. */
  muscles: string[];
  /** Short pitch for the library card. */
  blurb: string;
  /** Step-by-step how-to. */
  steps: string[];
  easier: string;
  harder: string;
  setup: SetupSpec;
  checks: FormCheck[];
  /** Per-frame measurement, or null when the joints it needs aren't visible. */
  measure: (body: Body) => Metrics | null;
  /** Shown as Beta until validated on real footage. */
  beta?: boolean;
  /** Starts standing but goes down to the floor (burpees): not for "no floor needed" lists. */
  floor?: boolean;
  /** Approximate calories per rep or per minute, for the workout summary. Rough by nature. */
  met: number;
}

export interface RepExercise extends BaseExercise {
  kind: "reps";
  /** Progress at which a rep starts and counts as attempted. */
  enterAt: number;
  /** Progress below which a rep has returned to the start position. */
  exitAt: number;
  /** A rep must reach this progress to count at all. */
  countAt: number;
  /** A rep must reach this progress to have full depth. */
  depthAt: number;
  /** Faster than this (whole rep) is flagged as rushing. */
  minRepMs: number;
  /** When the exercise alternates sides (lunges, high knees, alternating curls), each side's rep counts once. */
  alternating?: boolean;
  /** What "depth" means for this exercise, for summaries: "elbow bend", "squat depth". */
  depthLabel: string;
  /** Live cue when a rep turns around short of full depth. */
  shallowCue: string;
  shallowTip: string;
}

export interface HoldExercise extends BaseExercise {
  kind: "hold";
  /** Is the person in the hold position on this frame? */
  inPosition: (m: Metrics) => boolean;
}

export type Exercise = RepExercise | HoldExercise;
