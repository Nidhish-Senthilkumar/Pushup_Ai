import { Body } from "./body";
import type { Exercise } from "./exercise";
import type { Landmark, Point3, PoseFrame } from "./types";

/**
 * Picks who to coach when several people are in view, by watching who is
 * actually doing the exercise.
 *
 * Following the biggest person fails exactly where Cadence is most often used:
 * at a booth, a spectator standing nearer the camera is bigger than the person
 * exercising. Tested on real footage of a woman curling next to a presenter
 * who stands still and talks: "biggest" followed the presenter for the whole
 * clip and counted nothing (VALIDATION.md). So every person in view is
 * tracked, each one's rep progress for this exercise is measured, and the
 * person whose progress moves through the most range over the last few
 * seconds is followed, with hysteresis so a passer-by's gesture doesn't steal
 * the tracking.
 */

interface Candidate {
  landmarks: Landmark[];
  world?: Point3[];
}

interface Track {
  id: number;
  cx: number;
  cy: number;
  size: number;
  lastSeen: number;
  history: { t: number; p: number }[];
}

const WINDOW_MS = 3500;
const TTL_MS = 1200;

function box(lm: Landmark[]) {
  const seen = lm.filter((p) => p.visibility >= 0.4);
  if (seen.length < 4) return null;
  const xs = seen.map((p) => p.x);
  const ys = seen.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, size: Math.max(x1 - x0, y1 - y0), area: (x1 - x0) * (y1 - y0) };
}

export class PersonSelector {
  private tracks: Track[] = [];
  private nextId = 1;
  private followed: number | null = null;
  private challenger: { id: number; since: number } | null = null;

  constructor(private ex: Exercise) {}

  /**
   * Returns the frame to coach, whether the followed person just changed, and
   * the lowest rep progress the new person reached recently (so a rep they
   * were already halfway through when picked still counts).
   */
  select(frame: PoseFrame & { candidates?: Candidate[] }): { frame: PoseFrame; switched: boolean; recentMin?: number } {
    const cands = frame.candidates;
    if (!cands || cands.length <= 1) return { frame, switched: false };
    const t = frame.t;
    const longSide = Math.max(frame.width, frame.height);
    const boxes = cands.map((c) => box(c.landmarks));
    // Match each candidate to the nearest track.
    const used = new Set<Track>();
    const matched: (Track | null)[] = boxes.map((b) => {
      if (!b) return null;
      let best: Track | null = null;
      let bestD = Infinity;
      for (const tr of this.tracks) {
        if (used.has(tr)) continue;
        const d = Math.hypot(tr.cx - b.cx, tr.cy - b.cy);
        if (d < Math.max(0.3 * tr.size, 0.08 * longSide) && d < bestD) {
          best = tr;
          bestD = d;
        }
      }
      if (best) used.add(best);
      return best;
    });
    boxes.forEach((b, i) => {
      if (!b) return;
      let tr = matched[i];
      if (!tr) {
        tr = { id: this.nextId++, cx: b.cx, cy: b.cy, size: b.size, lastSeen: t, history: [] };
        this.tracks.push(tr);
        matched[i] = tr;
      }
      tr.cx = b.cx;
      tr.cy = b.cy;
      tr.size = b.size;
      tr.lastSeen = t;
      const m = this.ex.measure(new Body({ ...frame, landmarks: cands[i]!.landmarks, world: cands[i]!.world }));
      if (m) {
        // For alternating exercises either side's progress counts as activity.
        const p = Math.max(m.p, m.pL ?? -Infinity, m.pR ?? -Infinity);
        if (Number.isFinite(p)) tr.history.push({ t, p: Math.max(-0.3, Math.min(1.3, p)) });
      }
      while (tr.history.length && t - tr.history[0]!.t > WINDOW_MS) tr.history.shift();
    });
    this.tracks = this.tracks.filter((tr) => t - tr.lastSeen <= TTL_MS);

    const activity = (tr: Track) => {
      if (tr.history.length < 4) return 0;
      const ps = tr.history.map((h) => h.p);
      return Math.max(...ps) - Math.min(...ps);
    };
    const present = matched.map((tr, i) => ({ tr, i })).filter((x): x is { tr: Track; i: number } => !!x.tr);
    if (!present.length) return { frame, switched: false };
    let current = present.find((x) => x.tr.id === this.followed);
    let switched = false;
    if (!current) {
      // Nobody followed yet (or they left): the most active, then the biggest.
      current = present.reduce((a, b) => {
        const d = activity(b.tr) - activity(a.tr);
        if (Math.abs(d) > 0.15) return d > 0 ? b : a;
        return (boxes[b.i]?.area ?? 0) > (boxes[a.i]?.area ?? 0) ? b : a;
      });
      switched = this.followed !== null;
      this.followed = current.tr.id;
      this.challenger = null;
    } else {
      // Someone else clearly more active for a sustained moment: switch to them.
      const rival = present.filter((x) => x !== current).reduce<{ tr: Track; i: number } | null>((a, b) => (!a || activity(b.tr) > activity(a.tr) ? b : a), null);
      if (rival && activity(rival.tr) > Math.max(0.35, activity(current.tr) + 0.3)) {
        if (!this.challenger || this.challenger.id !== rival.tr.id) this.challenger = { id: rival.tr.id, since: t };
        else if (t - this.challenger.since > 700) {
          current = rival;
          this.followed = rival.tr.id;
          this.challenger = null;
          switched = true;
        }
      } else {
        this.challenger = null;
      }
    }
    const c = cands[current.i]!;
    const recentMin = switched && current.tr.history.length ? Math.min(...current.tr.history.map((h) => h.p)) : undefined;
    return { frame: { ...frame, landmarks: c.landmarks, world: c.world }, switched, recentMin };
  }
}
