import type { Landmark, PoseFrame, Point3 } from "../engine/types";

/**
 * Converts the model's output to pixels and makes a first guess at who to
 * follow: the biggest body, then whoever stays in the same place. That guess
 * is only the default. When several people are in view, all of them are
 * passed on as candidates, and the session (which knows the exercise) follows
 * whoever is actually doing it; see engine/selector.ts.
 */

interface Raw {
  landmarks: { x: number; y: number; visibility?: number }[];
  world?: { x: number; y: number; z: number }[];
}

function box(pose: Landmark[]) {
  const seen = pose.filter((p) => p.visibility >= 0.4);
  if (seen.length < 4) return null;
  const xs = seen.map((p) => p.x);
  const ys = seen.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, area: (x1 - x0) * (y1 - y0), size: Math.max(x1 - x0, y1 - y0) };
}

export class PersonPicker {
  private last: { cx: number; cy: number; size: number; t: number } | null = null;

  reset() {
    this.last = null;
  }

  pick(people: Raw[], width: number, height: number, t: number): PoseFrame {
    const candidates = people.map((p) => {
      const landmarks: Landmark[] = p.landmarks.map((q) => ({ x: q.x * width, y: q.y * height, visibility: q.visibility ?? 0 }));
      const world: Point3[] | undefined = p.world?.map((q) => ({ x: q.x, y: q.y, z: q.z }));
      return { landmarks, world, box: box(landmarks) };
    });
    const valid = candidates.filter((c) => c.box);
    if (!valid.length) {
      if (this.last && t - this.last.t > 1000) this.last = null;
      return { t, width, height, landmarks: [], people: 0 };
    }
    let chosen = valid[0]!;
    if (this.last && t - this.last.t <= 1000) {
      const last = this.last;
      const d = (c: (typeof valid)[number]) => Math.hypot(c.box!.cx - last.cx, c.box!.cy - last.cy);
      const near = valid.filter((c) => d(c) < Math.max(0.35 * last.size, 0.12 * Math.max(width, height)));
      chosen = near.length ? near.reduce((a, b) => (d(a) <= d(b) ? a : b)) : valid.reduce((a, b) => (a.box!.area >= b.box!.area ? a : b));
    } else {
      chosen = valid.reduce((a, b) => (a.box!.area >= b.box!.area ? a : b));
    }
    this.last = { cx: chosen.box!.cx, cy: chosen.box!.cy, size: chosen.box!.size, t };
    const frame: PoseFrame = { t, width, height, landmarks: chosen.landmarks, world: chosen.world, people: valid.length };
    // With several people in view, hand everyone to the session: it knows the
    // exercise, so it can tell who is actually doing it (engine/selector.ts).
    if (valid.length > 1) frame.candidates = valid.map((c) => ({ landmarks: c.landmarks, world: c.world }));
    return frame;
  }
}
