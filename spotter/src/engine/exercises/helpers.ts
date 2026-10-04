import { Body, jointIndex, type Joint } from "../body";
import { angle, angle3, belowLine, clamp, dist, fromDown } from "../geometry";
import type { Side } from "../types";

/** Progress from a value that falls as the rep deepens (an elbow closing): `top` maps to 0, `bottom` to 1. */
export function falling(v: number, top: number, bottom: number): number {
  return clamp((top - v) / (top - bottom), -0.5, 1.5);
}

/** Progress from a value that rises as the rep deepens (an arm lifting). */
export function rising(v: number, start: number, end: number): number {
  return clamp((v - start) / (end - start), -0.5, 1.5);
}

/** Required-landmark alternatives for a side-view exercise: all of these joints on the left, or all on the right. */
export function eitherSide(...joints: Joint[]): number[][] {
  return (["left", "right"] as Side[]).map((s) => joints.map((j) => jointIndex(s, j)));
}

/** Required-landmark group for a front-view exercise: these joints on both sides. */
export function bothSides(...joints: Joint[]): number[][] {
  return [(["left", "right"] as Side[]).flatMap((s) => joints.map((j) => jointIndex(s, j)))];
}

export function sideVisible(body: Body, side: Side, joints: Joint[]): boolean {
  return body.visible(...joints.map((j) => jointIndex(side, j)));
}

/**
 * Joint angle that holds up from any camera angle. In a side view the motion
 * is in the picture plane and the 2D angle is the most accurate; from the
 * front, the motion goes toward the camera and only the 3D world estimate can
 * see it.
 */
export function jointAngle(body: Body, side: Side, a: Joint, b: Joint, c: Joint, sideView: boolean): number {
  if (sideView || !body.world) return angle(body.j(side, a), body.j(side, b), body.j(side, c));
  const wa = body.jw(side, a);
  const wb = body.jw(side, b);
  const wc = body.jw(side, c);
  return wa && wb && wc ? angle3(wa, wb, wc) : angle(body.j(side, a), body.j(side, b), body.j(side, c));
}

/**
 * Hip offset from the straight line through shoulder and ankle (or knee for
 * kneeling variants), as a share of that line's length. Positive means the
 * hip hangs below the line (sagging), negative means above it (piking).
 */
export function hipLine(body: Body, side: Side, end: "ankle" | "knee" = "ankle"): number {
  const s = body.j(side, "shoulder");
  const h = body.j(side, "hip");
  const e = body.j(side, end);
  const len = dist(s, e) || 1;
  return belowLine(h, s, e) / len;
}

/** Arm raised from hanging (0 degrees) toward straight overhead (180), measured shoulder to wrist in the picture. */
export function armRaise(body: Body, side: Side): number {
  return fromDown(body.j(side, "shoulder"), body.j(side, "wrist"));
}

/** Torso lean from vertical in the picture, in degrees: 0 upright, 90 lying flat. */
export function torsoLean(body: Body, side: Side): number {
  return 180 - fromDown(body.j(side, "hip"), body.j(side, "shoulder"));
}

export function segment(body: Body, side: Side, a: Joint, b: Joint): number {
  return dist(body.j(side, a), body.j(side, b));
}

/** Mean of the visible sides' values; null when neither side is usable. */
export function bySide(body: Body, joints: Joint[], f: (s: Side) => number): { mean: number; left: number; right: number } | null {
  const l = sideVisible(body, "left", joints) ? f("left") : NaN;
  const r = sideVisible(body, "right", joints) ? f("right") : NaN;
  const vals = [l, r].filter(Number.isFinite);
  if (!vals.length) return null;
  return { mean: vals.reduce((s, v) => s + v, 0) / vals.length, left: l, right: r };
}
