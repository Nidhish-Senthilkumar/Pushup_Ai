import { Body } from "./body";
import type { Exercise, FormCheck, Metrics, RepAggregate, RepExercise } from "./exercise";
import { checkFraming, type Framing, type FramingIssue } from "./framing";
import { LandmarkSmoother, OneEuro } from "./filters";
import { clamp, mean } from "./geometry";
import { PersonSelector } from "./selector";
import type { Landmark, PoseFrame } from "./types";

/**
 * Runs one set of one exercise: framing, start detection, rep counting or
 * hold timing, form checks, scoring and cues. Feed it every pose frame with
 * `push`; read the live state it returns and drain `events` for things the UI
 * should react to (a rep finished, a cue to show or say).
 *
 * It is the same code for every exercise and for every way frames arrive
 * (live camera, a recorded trace in a test, a synthetic skeleton).
 */

export type Quality = "perfect" | "good" | "fair" | "poor";

export interface RepResult {
  index: number;
  t: number;
  side?: "left" | "right";
  durationMs: number;
  downMs: number;
  upMs: number;
  /** Deepest progress reached, 1 = full depth. */
  peak: number;
  faults: string[];
  score: number;
  /** Full depth and no major fault. */
  clean: boolean;
  quality: Quality;
  rushed: boolean;
}

export type SessionEvent =
  | { type: "rep"; rep: RepResult }
  | { type: "cue"; id: string; text: string; major: boolean }
  | { type: "shallow"; text: string }
  | { type: "lost" }
  | { type: "found" };

export interface LiveState {
  t: number;
  found: boolean;
  framing: Framing;
  /** Framing issues that have persisted long enough to be worth showing. */
  issues: FramingIssue[];
  /** In the start position with everything visible. */
  ready: boolean;
  readyForMs: number;
  started: boolean;
  /** Smoothed rep progress, 0 = start position, 1 = full depth. */
  p: number | null;
  reps: number;
  cleanReps: number;
  inRep: boolean;
  holdMs: number;
  goodHoldMs: number;
  inPosition: boolean;
  /** Fault ids happening right now. */
  activeFaults: string[];
  /** Landmarks to colour as faulty. */
  highlight: number[];
  metrics: Metrics | null;
  lastRep: RepResult | null;
  /** The landmarks of the person being coached on this frame, for drawing. */
  subject: PoseFrame["landmarks"];
  /** Which way the camera sees the person, when someone is in view. */
  view: "front" | "side" | "angled" | null;
}

export interface SessionOptions {
  /** Arcade mode: only clean reps count. */
  formGate?: boolean;
  /**
   * How deep a rep has to go to count as full depth. "easy" puts the bar
   * halfway between "counts at all" and standard full depth, for casual booth
   * visitors; "strict" asks a little more than standard.
   */
  strictness?: "easy" | "standard" | "strict";
  /** Minimum gap between spoken/shown fault cues. */
  cueGapMs?: number;
}

export interface SetSummary {
  exerciseId: string;
  kind: "reps" | "hold";
  startedAt: number;
  durationMs: number;
  reps: RepResult[];
  repCount: number;
  cleanCount: number;
  /** 0 to 100. Reps: mean rep score. Holds: share of the hold in good form. */
  score: number;
  faultCounts: Record<string, number>;
  holdMs: number;
  goodHoldMs: number;
  /** Rep progress over time, about 10 samples a second, for the summary chart. */
  trace: { t: number; p: number }[];
  /** Skeleton at the deepest point of the best and worst reps, for the side-by-side comparison. */
  bestRep?: RepSnapshot;
  worstRep?: RepSnapshot;
}

/** A skeleton snapshot: 33 points as [x0, y0, x1, y1, ...], scaled to fit a unit box, and the joints to mark. */
export interface RepSnapshot {
  index: number;
  score: number;
  pose: number[];
  joints: number[];
}

function snapshot(lm: Landmark[]): number[] {
  const seen = lm.filter((p) => p.visibility >= 0.3);
  if (seen.length < 6) return [];
  const xs = seen.map((p) => p.x);
  const ys = seen.map((p) => p.y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const size = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) || 1;
  return lm.flatMap((p) => [Math.round(((p.x - x0) / size) * 1000) / 1000, Math.round(((p.y - y0) / size) * 1000) / 1000]);
}

interface Tracker {
  side?: "left" | "right";
  key: "p" | "pL" | "pR";
  filter: OneEuro;
  p: number | null;
  /** Has been seen in the start position since the last rep. A rep can only begin from there. */
  armed: boolean;
  inRep: boolean;
  start: number;
  peak: number;
  peakT: number;
  frames: Metrics[];
  peakMetrics: Metrics | null;
  peakPose: Landmark[] | null;
  shallowCued: boolean;
  faultsThisRep: Set<string>;
}

/**
 * Issues that pause a running set. Distance isn't one: it's judged on body
 * length in the picture, which shrinks at the bottom of a squat seen from the
 * front (the thighs point at the camera), so it's only checked during setup.
 */
const VISIBILITY_ISSUES = new Set<FramingIssue>(["no-person", "too-close", "feet-cut", "head-cut", "arms-cut"]);

const QUALITY: [number, Quality][] = [
  [90, "perfect"],
  [75, "good"],
  [55, "fair"],
  [0, "poor"],
];

export function qualityOf(score: number): Quality {
  return (QUALITY.find(([min]) => score >= min) as [number, Quality])[1];
}

function aggregate(frames: Metrics[], peakMetrics: Metrics | null, peak: number, start: number, peakT: number, end: number): RepAggregate {
  const keys = Object.keys(frames[0] ?? {});
  const min: Record<string, number> = {};
  const max: Record<string, number> = {};
  const avg: Record<string, number> = {};
  for (const k of keys) {
    const vals = frames.map((f) => f[k] as number).filter((v) => Number.isFinite(v));
    min[k] = vals.length ? Math.min(...vals) : NaN;
    max[k] = vals.length ? Math.max(...vals) : NaN;
    avg[k] = vals.length ? mean(vals) : NaN;
  }
  return {
    min,
    max,
    mean: avg,
    atPeak: { ...(peakMetrics ?? {}) },
    peak,
    durationMs: end - start,
    downMs: peakT - start,
    upMs: end - peakT,
  };
}

export class ExerciseSession {
  readonly ex: Exercise;
  readonly opts: Required<SessionOptions>;
  events: SessionEvent[] = [];

  private smoother = new LandmarkSmoother();
  private worldSmoother = new LandmarkSmoother();
  private selector: PersonSelector;
  private trackers: Tracker[] = [];
  private reps: RepResult[] = [];
  private startedAt: number | null = null;
  private lastT = 0;
  private lastSeen = 0;
  private lost = false;
  private readySince: number | null = null;
  private issueSince = new Map<FramingIssue, number>();
  private faultSince = new Map<string, number>();
  private firing = new Set<string>();
  private lastCueAt = -Infinity;
  private lastCueById = new Map<string, number>();
  private holdMs = 0;
  private goodHoldMs = 0;
  private holdFaultMs = new Map<string, number>();
  private trace: { t: number; p: number }[] = [];
  private lastTraceT = -Infinity;
  private lastRep: RepResult | null = null;
  private snapshots = new Map<number, number[]>();
  private lastState: LiveState | null = null;

  constructor(ex: Exercise, opts: SessionOptions = {}) {
    this.ex = ex;
    this.opts = { formGate: false, cueGapMs: 2200, strictness: "standard", ...opts };
    this.selector = new PersonSelector(ex);
    if (ex.kind === "reps") {
      const mk = (key: Tracker["key"], side?: "left" | "right"): Tracker => ({
        key,
        side,
        filter: new OneEuro(2.5, 0.05),
        p: null,
        armed: false,
        inRep: false,
        start: 0,
        peak: 0,
        peakT: 0,
        frames: [],
        peakMetrics: null,
        peakPose: null,
        shallowCued: false,
        faultsThisRep: new Set(),
      });
      this.trackers = ex.alternating ? [mk("pL", "left"), mk("pR", "right")] : [mk("p")];
    }
  }

  get started(): boolean {
    return this.startedAt !== null;
  }

  /** Start counting. Called by the UI after a countdown, or automatically by `autoStart`. */
  begin(t: number) {
    if (this.startedAt === null) this.startedAt = t;
  }

  drain(): SessionEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  push(input: PoseFrame): LiveState {
    const { frame: raw, switched, recentMin } = this.selector.select(input);
    if (switched) {
      // A different person: their position and rep state start fresh. If they
      // were in the start position in the last few seconds, they may be in the
      // middle of a rep right now, so let it count.
      this.smoother.reset();
      this.worldSmoother.reset();
      const wasAtStart = this.ex.kind === "reps" && recentMin !== undefined && recentMin <= this.ex.exitAt + 0.05;
      for (const tr of this.trackers) {
        tr.inRep = false;
        tr.armed = wasAtStart;
        tr.filter.reset();
      }
    }
    const t = raw.t;
    this.lastT = t;
    const frame: PoseFrame = raw.landmarks.length
      ? { ...raw, landmarks: this.smoother.smooth(raw.landmarks, t), world: raw.world ? this.worldSmoother.smooth(raw.world, t) : undefined }
      : raw;
    const body = new Body(frame);
    const framing = checkFraming(body, this.ex);
    const metrics = body.present && framing.issues[0] !== "no-person" ? this.ex.measure(body) : null;
    // Once a set is running, only losing sight of the body pauses it. Turning a
    // little, or standing up at the top of a sit-up, is part of the movement.
    const visibleOk = !framing.issues.some((i) => VISIBILITY_ISSUES.has(i));
    const found = metrics !== null && (this.started ? visibleOk : framing.ok);

    // Debounce framing issues so the hint doesn't flicker frame to frame.
    for (const k of [...this.issueSince.keys()]) if (!framing.issues.includes(k)) this.issueSince.delete(k);
    for (const k of framing.issues) if (!this.issueSince.has(k)) this.issueSince.set(k, t);
    const issues = framing.issues.filter((k) => t - (this.issueSince.get(k) ?? t) >= 500 || k === "no-person");

    const startPose = metrics !== null && framing.ok && this.ex.setup.startPose(metrics, body);
    if (startPose) this.readySince ??= t;
    else this.readySince = null;
    const readyForMs = this.readySince === null ? 0 : t - this.readySince;

    if (this.started) {
      if (found) {
        if (this.lost) this.events.push({ type: "found" });
        this.lost = false;
        this.lastSeen = t;
      } else if (!this.lost && t - this.lastSeen > 1500) {
        this.lost = true;
        this.events.push({ type: "lost" });
        // A rep that was in progress when tracking dropped can't be scored fairly.
        for (const tr of this.trackers) {
          tr.inRep = false;
          tr.armed = false;
        }
      }
    } else if (found) {
      this.lastSeen = t;
    }

    let inPosition = false;
    if (this.started && found && metrics) {
      if (this.ex.kind === "reps") this.stepReps(this.ex, metrics, t, frame.landmarks);
      else inPosition = this.stepHold(metrics, t);
    } else {
      // Keep the progress filters warm so the first rep after starting isn't
      // distorted, and note anyone already in the start position: they can go
      // straight into a rep the moment the set starts.
      for (const tr of this.trackers) {
        const v = metrics?.[tr.key];
        if (v === undefined || !Number.isFinite(v)) continue;
        tr.p = tr.filter.filter(v, t);
        if (this.ex.kind === "reps") {
          if (tr.p <= this.ex.exitAt) tr.armed = true;
          else if (tr.p >= this.ex.enterAt) tr.armed = false;
        }
      }
      this.clearFaults();
    }

    const pNow = this.trackers.length ? Math.max(...this.trackers.map((tr) => (tr.p !== null && Number.isFinite(tr.p) ? tr.p : 0))) : null;
    if (this.started && pNow !== null && t - this.lastTraceT >= 100) {
      this.trace.push({ t: t - (this.startedAt ?? t), p: Math.round(clamp(pNow, -0.2, 1.4) * 1000) / 1000 });
      this.lastTraceT = t;
    }

    const highlight = new Set<number>();
    for (const id of this.firing) for (const j of this.check(id)?.joints ?? []) highlight.add(j);

    const state: LiveState = {
      t,
      found,
      framing,
      issues,
      ready: startPose,
      readyForMs,
      started: this.started,
      p: metrics ? pNow : null,
      reps: this.countedReps(),
      cleanReps: this.reps.filter((r) => r.clean).length,
      inRep: this.trackers.some((tr) => tr.inRep),
      holdMs: this.holdMs,
      goodHoldMs: this.goodHoldMs,
      inPosition,
      activeFaults: [...this.firing],
      highlight: [...highlight],
      metrics,
      lastRep: this.lastRep,
      subject: raw.landmarks,
      view: body.present ? body.view() : null,
    };
    this.lastState = state;
    return state;
  }

  private check(id: string): FormCheck | undefined {
    return this.ex.checks.find((c) => c.id === id);
  }

  private countedReps(): number {
    return this.opts.formGate ? this.reps.filter((r) => r.clean).length : this.reps.length;
  }

  private clearFaults() {
    this.faultSince.clear();
    this.firing.clear();
  }

  /** Live checks: a fault fires after it has lasted its hold time, and cues once per firing. */
  private stepLiveChecks(m: Metrics, t: number, onFire: (c: FormCheck) => void) {
    for (const c of this.ex.checks) {
      if (c.kind !== "live" || !c.live) continue;
      const bad = c.live(m);
      if (bad === true) {
        if (!this.faultSince.has(c.id)) this.faultSince.set(c.id, t);
        const since = this.faultSince.get(c.id) as number;
        if (t - since >= (c.holdMs ?? 250) && !this.firing.has(c.id)) {
          this.firing.add(c.id);
          onFire(c);
          this.cue(c.id, c.cue, c.major && !c.beta, t);
        }
      } else if (bad === false) {
        this.faultSince.delete(c.id);
        this.firing.delete(c.id);
      }
      // null: can't tell on this frame (joint hidden). Keep the current state.
    }
  }

  private cue(id: string, text: string, major: boolean, t: number) {
    const lastSame = this.lastCueById.get(id) ?? -Infinity;
    if (t - this.lastCueAt < this.opts.cueGapMs) return;
    if (t - lastSame < this.opts.cueGapMs * 2) return;
    this.lastCueAt = t;
    this.lastCueById.set(id, t);
    this.events.push({ type: "cue", id, text, major });
  }

  /** Full-depth threshold for this session's strictness. */
  private depthAt(ex: RepExercise): number {
    const s = this.opts.strictness;
    if (s === "easy") return ex.countAt + (ex.depthAt - ex.countAt) * 0.5;
    if (s === "strict") return Math.min(ex.depthAt + 0.08, 1.05);
    return ex.depthAt;
  }

  private stepReps(ex: RepExercise, m: Metrics, t: number, lm: Landmark[]) {
    const active = this.trackers.filter((tr) => tr.inRep);
    this.stepLiveChecks(m, t, (c) => {
      for (const tr of active) tr.faultsThisRep.add(c.id);
    });
    // Faults only matter inside a rep; standing at the top between reps isn't scored.
    if (!active.length) this.clearFaults();

    for (const tr of this.trackers) {
      const rawP = m[tr.key];
      if (rawP === undefined || !Number.isFinite(rawP)) continue;
      const p = tr.filter.filter(rawP, t);
      tr.p = p;
      if (!tr.inRep) {
        if (p <= ex.exitAt) tr.armed = true;
        // Only from the start position: someone already at the bottom when
        // tracking begins (or who just reappeared there) hasn't done a rep yet.
        if (p >= ex.enterAt && tr.armed) {
          tr.inRep = true;
          tr.start = t;
          tr.peak = p;
          tr.peakT = t;
          tr.frames = [m];
          tr.peakMetrics = m;
          tr.peakPose = lm;
          tr.shallowCued = false;
          tr.faultsThisRep = new Set(this.firing);
        }
        continue;
      }
      tr.frames.push(m);
      if (p > tr.peak) {
        tr.peak = p;
        tr.peakT = t;
        tr.peakMetrics = m;
        tr.peakPose = lm;
      }
      // Turned around short of full depth: say so now, while it can still help.
      if (!tr.shallowCued && tr.peak >= ex.enterAt && tr.peak < this.depthAt(ex) && p < tr.peak - 0.12 && tr.peak > ex.countAt * 0.7) {
        tr.shallowCued = true;
        if (t - this.lastCueAt >= 900) {
          this.lastCueAt = t;
          this.events.push({ type: "shallow", text: ex.shallowCue });
        }
      }
      if (p <= ex.exitAt) {
        tr.inRep = false;
        tr.armed = true;
        if (tr.peak >= ex.countAt && t - tr.start >= 250) this.finishRep(ex, tr, t);
        tr.frames = [];
      }
    }
  }

  private finishRep(ex: RepExercise, tr: Tracker, t: number) {
    const agg = aggregate(tr.frames, tr.peakMetrics, tr.peak, tr.start, tr.peakT, t);
    if (tr.side) agg.side = tr.side;
    const faults = new Set(tr.faultsThisRep);
    for (const c of ex.checks) if (c.kind === "rep" && c.rep && c.rep(agg)) faults.add(c.id);
    const rushed = agg.durationMs < ex.minRepMs;
    const scored = [...faults].map((id) => this.check(id)).filter((c): c is FormCheck => !!c && !c.beta);
    const depthAt = this.depthAt(ex);
    const depth = clamp((tr.peak - ex.countAt) / Math.max(0.01, depthAt - ex.countAt), 0, 1);
    let score = 60 + 40 * depth;
    for (const c of scored) score -= c.major ? 25 : 10;
    if (rushed) score -= 10;
    score = Math.round(clamp(score, 0, 100));
    const clean = tr.peak >= depthAt && !scored.some((c) => c.major);

    // Two arms curling together are one rep, not two: merge reps on opposite
    // sides whose time spans mostly overlap. Alternating legs barely overlap.
    const prev = this.reps[this.reps.length - 1];
    const startedAt = this.startedAt ?? t;
    const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)) / Math.max(1, Math.max(a1, b1) - Math.min(a0, b0));
    if (
      ex.alternating &&
      prev &&
      prev.side &&
      prev.side !== tr.side &&
      overlap(prev.t - prev.durationMs, prev.t, tr.start - startedAt, t - startedAt) > 0.5
    ) {
      if (score < prev.score) {
        prev.score = score;
        prev.quality = qualityOf(score);
        prev.clean = prev.clean && clean;
        prev.faults = [...new Set([...prev.faults, ...faults])];
      }
      return;
    }

    const rep: RepResult = {
      index: this.reps.length + 1,
      t: t - (this.startedAt ?? t),
      side: tr.side,
      durationMs: agg.durationMs,
      downMs: agg.downMs,
      upMs: agg.upMs,
      peak: Math.round(tr.peak * 100) / 100,
      faults: [...faults],
      score,
      clean,
      quality: qualityOf(score),
      rushed,
    };
    this.reps.push(rep);
    if (tr.peakPose) this.snapshots.set(rep.index, snapshot(tr.peakPose));
    this.lastRep = rep;
    this.events.push({ type: "rep", rep });
  }

  private stepHold(m: Metrics, t: number): boolean {
    const ex = this.ex;
    if (ex.kind !== "hold") return false;
    const dt = Math.min(250, Math.max(0, t - (this.lastState?.t ?? t)));
    const inPos = ex.inPosition(m);
    if (!inPos) {
      this.clearFaults();
      return false;
    }
    this.stepLiveChecks(m, t, () => {});
    this.holdMs += dt;
    const majorFiring = [...this.firing].some((id) => {
      const c = this.check(id);
      return c && c.major && !c.beta;
    });
    if (!majorFiring) this.goodHoldMs += dt;
    for (const id of this.firing) this.holdFaultMs.set(id, (this.holdFaultMs.get(id) ?? 0) + dt);
    return true;
  }

  private bestAndWorst(): { bestRep?: RepSnapshot; worstRep?: RepSnapshot } {
    const withPose = this.reps.filter((r) => (this.snapshots.get(r.index)?.length ?? 0) > 0);
    if (withPose.length < 2) return {};
    const best = withPose.reduce((a, b) => (b.score > a.score || (b.score === a.score && b.peak > a.peak) ? b : a));
    const worst = withPose.reduce((a, b) => (b.score < a.score || (b.score === a.score && b.peak < a.peak) ? b : a));
    if (best === worst || best.score - worst.score < 10) return {};
    const joints = (r: RepResult) => [...new Set(r.faults.flatMap((id) => this.check(id)?.joints ?? []))];
    return {
      bestRep: { index: best.index, score: best.score, pose: this.snapshots.get(best.index)!, joints: [] },
      worstRep: { index: worst.index, score: worst.score, pose: this.snapshots.get(worst.index)!, joints: joints(worst) },
    };
  }

  summary(): SetSummary {
    const startedAt = this.startedAt ?? this.lastT;
    const faultCounts: Record<string, number> = {};
    if (this.ex.kind === "reps") {
      for (const r of this.reps) for (const f of r.faults) faultCounts[f] = (faultCounts[f] ?? 0) + 1;
    } else {
      // For holds, count each fault in whole seconds spent in it.
      for (const [id, ms] of this.holdFaultMs) if (ms >= 500) faultCounts[id] = Math.round(ms / 1000);
    }
    const score =
      this.ex.kind === "reps"
        ? this.reps.length
          ? Math.round(mean(this.reps.map((r) => r.score)))
          : 0
        : this.holdMs > 0
          ? Math.round((100 * this.goodHoldMs) / this.holdMs)
          : 0;
    return {
      exerciseId: this.ex.id,
      kind: this.ex.kind,
      startedAt,
      durationMs: Math.max(0, this.lastT - startedAt),
      reps: [...this.reps],
      repCount: this.countedReps(),
      cleanCount: this.reps.filter((r) => r.clean).length,
      score,
      faultCounts,
      holdMs: Math.round(this.holdMs),
      goodHoldMs: Math.round(this.goodHoldMs),
      trace: this.trace,
      ...this.bestAndWorst(),
    };
  }
}
