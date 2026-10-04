import type { Point, Point3 } from "./types";

export const RAD = 180 / Math.PI;

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dist3(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function mid3(a: Point3, b: Point3): Point3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

/** Angle at b, in degrees, between the segments b->a and b->c (2D). Same formula as the team's Python `calculate_angle`. */
export function angle(a: Point, b: Point, c: Point): number {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const m = Math.hypot(bax, bay) * Math.hypot(bcx, bcy);
  if (m === 0) return NaN;
  const cos = Math.max(-1, Math.min(1, (bax * bcx + bay * bcy) / m));
  return Math.acos(cos) * RAD;
}

/** Angle at b, in degrees, in 3D. */
export function angle3(a: Point3, b: Point3, c: Point3): number {
  const ax = a.x - b.x;
  const ay = a.y - b.y;
  const az = a.z - b.z;
  const cx = c.x - b.x;
  const cy = c.y - b.y;
  const cz = c.z - b.z;
  const m = Math.hypot(ax, ay, az) * Math.hypot(cx, cy, cz);
  if (m === 0) return NaN;
  const cos = Math.max(-1, Math.min(1, (ax * cx + ay * cy + az * cz) / m));
  return Math.acos(cos) * RAD;
}

/** Angle of the vector a->b above the horizontal, in degrees (0 = level, 90 = straight up in the image). */
export function elevation(a: Point, b: Point): number {
  return Math.atan2(a.y - b.y, Math.abs(b.x - a.x)) * RAD;
}

/** Angle between the vector a->b and straight down in the image, in degrees (0 = hanging down, 180 = straight up). */
export function fromDown(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const m = Math.hypot(dx, dy);
  if (m === 0) return NaN;
  return Math.acos(Math.max(-1, Math.min(1, dy / m))) * RAD;
}

/**
 * Signed distance of p from the line through a and b, positive when p is
 * below the line in the image (larger y). Used for the body line: a hip below
 * the shoulder-to-ankle line is sagging, above it is piking.
 */
export function belowLine(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return 0;
  // Cross product gives the perpendicular distance; orient it so "down" is positive.
  let d = ((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
  // The normal (dy, -dx) points down when dx < 0 and up when dx > 0.
  if (dx > 0) d = -d;
  return d;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN;
}

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

export function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}
