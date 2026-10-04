import type { Landmark, Point3, PoseFrame } from "./types";

/**
 * A synthetic 3D skeleton that can perform every exercise, with adjustable
 * form faults (sagging hips, knees caving, shallow reps...). Two jobs:
 *
 *   - unit tests: generate a set with known reps and known faults, run it
 *     through the engine, and check the engine finds exactly those;
 *   - the animated demos in the exercise library.
 *
 * Bodies are built in a body frame (F forward, U up, W toward the person's
 * left, metres), placed in the scene by a yaw angle, and projected onto a
 * camera image. Proportions are those of an average adult.
 */

const SH_W = 0.19;
const HIP_W = 0.1;
const TORSO = 0.5;
const UPPER = 0.29;
const FORE = 0.27;
const THIGH = 0.44;
const SHIN = 0.42;
const ANKLE_H = 0.08;

type V2 = [number, number]; // F, U

export type Faults = Record<string, number | undefined>;

interface SidePose {
  shoulder: V2;
  elbow: V2;
  wrist: V2;
  hip: V2;
  knee: V2;
  ankle: V2;
  /** Direction the foot points, in the F-U plane. */
  foot?: V2;
}

/** A body: per-side sagittal positions plus how far out to the side each joint sits. */
interface BodyPose {
  left: SidePose;
  right: SidePose;
  /** Lateral offsets (positive = outward from the midline). */
  wide?: Partial<Record<keyof SidePose, number>>;
  wideL?: Partial<Record<keyof SidePose, number>>;
  wideR?: Partial<Record<keyof SidePose, number>>;
  /** Some exercises move a limb out to the side (jumping jacks, lateral raises): full lateral override per side. */
  latL?: Partial<Record<keyof SidePose, number>>;
  latR?: Partial<Record<keyof SidePose, number>>;
}

const rad = (d: number) => (d * Math.PI) / 180;
const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V2, k: number): V2 => [a[0] * k, a[1] * k];
const len = (a: V2) => Math.hypot(a[0], a[1]);
const norm = (a: V2): V2 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
/** Unit vector at `deg` from straight down, rotating toward forward. */
const fromDown = (deg: number): V2 => [Math.sin(rad(deg)), -Math.cos(rad(deg))];
/** Unit vector at `deg` above the forward horizontal. */
const fromFwd = (deg: number): V2 => [Math.cos(rad(deg)), Math.sin(rad(deg))];

/** Two-link inverse kinematics: the middle joint between root and end. `bend` picks which side it bulges to. */
function ik(root: V2, end: V2, l1: number, l2: number, bend: 1 | -1): V2 {
  const d = sub(end, root);
  const dist = Math.min(len(d), l1 + l2 - 1e-6);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const u = norm(d);
  const perp: V2 = [-u[1] * bend, u[0] * bend];
  return add(add(root, mul(u, a)), mul(perp, h));
}

const smooth = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));

const stand = (): SidePose => ({
  shoulder: [0, ANKLE_H + SHIN + THIGH + TORSO],
  elbow: [0, ANKLE_H + SHIN + THIGH + TORSO - UPPER],
  wrist: [0.02, ANKLE_H + SHIN + THIGH + TORSO - UPPER - FORE],
  hip: [0, ANKLE_H + SHIN + THIGH],
  knee: [0.01, ANKLE_H + SHIN],
  ankle: [0, ANKLE_H],
  foot: [1, -0.3],
});

// ---------------------------------------------------------------- exercises

function pushupSide(d: number, f: Faults): SidePose {
  const knees = (f.knees ?? 0) > 0;
  const theta = 170 - 92 * d;
  const wrist: V2 = [0, 0.04];
  const dd = Math.sqrt(UPPER ** 2 + FORE ** 2 - 2 * UPPER * FORE * Math.cos(rad(theta)));
  const shift = 0.06 * d;
  const shoulder: V2 = [shift, 0.04 + Math.sqrt(Math.max(0, dd * dd - shift * shift))];
  const elbow = ik(wrist, shoulder, FORE, UPPER, 1);
  const legLen = knees ? THIGH : THIGH + SHIN;
  const span = TORSO + legLen;
  const endH = knees ? 0.06 : 0.1;
  const alpha = Math.asin(Math.max(-1, Math.min(1, (shoulder[1] - endH) / span)));
  const back: V2 = [-Math.cos(alpha), -Math.sin(alpha)];
  const down: V2 = [Math.sin(alpha), -Math.cos(alpha)];
  const end = add(shoulder, mul(back, span));
  const sag = (f.sag ?? 0) - (f.pike ?? 0);
  const hip = add(add(shoulder, mul(back, TORSO)), mul(down, sag * span));
  if (knees) {
    const knee = end;
    const ankle = add(knee, [-SHIN * 0.55, SHIN * 0.8]);
    return { shoulder, elbow, wrist, hip, knee, ankle, foot: [-1, 0.2] };
  }
  const knee = add(hip, mul(norm(sub(end, hip)), THIGH));
  return { shoulder, elbow, wrist, hip, knee, ankle: end, foot: [0.1, -1] };
}

function plankSide(f: Faults): SidePose {
  if ((f.forearm ?? 1) > 0) {
    const elbow: V2 = [0, 0.04];
    const wrist: V2 = [FORE, 0.03];
    const shoulder: V2 = [0, 0.04 + UPPER];
    const span = TORSO + THIGH + SHIN;
    const alpha = Math.asin((shoulder[1] - 0.1) / span);
    const back: V2 = [-Math.cos(alpha), -Math.sin(alpha)];
    const down: V2 = [Math.sin(alpha), -Math.cos(alpha)];
    const ankle = add(shoulder, mul(back, span));
    const sag = (f.sag ?? 0) - (f.pike ?? 0);
    const hip = add(add(shoulder, mul(back, TORSO)), mul(down, sag * span));
    const knee = add(hip, mul(norm(sub(ankle, hip)), THIGH));
    return { shoulder, elbow, wrist, hip, knee, ankle, foot: [0.1, -1] };
  }
  return pushupSide(0, f);
}

function squatSide(d: number, f: Faults): SidePose {
  const aT = 90 * d;
  const aS = 30 * d;
  const ankle: V2 = [0, ANKLE_H];
  const knee = add(ankle, [SHIN * Math.sin(rad(aS)), SHIN * Math.cos(rad(aS))]);
  const hip = add(knee, [-THIGH * Math.sin(rad(aT)), THIGH * Math.cos(rad(aT))]);
  const lean = 8 + 28 * d + (f.lean ?? 0) * d;
  const shoulder = add(hip, [TORSO * Math.sin(rad(lean)), TORSO * Math.cos(rad(lean))]);
  const arm = fromDown(85 * d);
  const elbow = add(shoulder, mul(arm, UPPER));
  const wrist = add(elbow, mul(arm, FORE));
  return { shoulder, elbow, wrist, hip, knee, ankle, foot: [1, -0.3] };
}

function lungePose(d: number, lead: "left" | "right", f: Faults): { left: SidePose; right: SidePose } {
  // Feet start together and step apart as the rep begins.
  const st = Math.min(1, d / 0.3);
  const frontAnkle: V2 = [0.4 * st, ANKLE_H];
  const backAnkle: V2 = [-0.42 * st, ANKLE_H + 0.04 * st];
  const top = ANKLE_H + Math.sqrt((THIGH + SHIN) ** 2 - (0.42 * st) ** 2) - 0.01;
  const h = top - 0.31 * d;
  const hip: V2 = [-0.02 * st, h];
  const frontKnee = ik(hip, frontAnkle, THIGH, SHIN, 1);
  const backKnee = ik(hip, backAnkle, THIGH, SHIN, 1);
  const lean = 4 + (f.lean ?? 0) * d;
  const shoulder = add(hip, [TORSO * Math.sin(rad(lean)), TORSO * Math.cos(rad(lean))]);
  const elbow = add(shoulder, [0, -UPPER]);
  const wrist = add(elbow, [0.03, -FORE]);
  const front: SidePose = { shoulder, elbow, wrist, hip, knee: frontKnee, ankle: frontAnkle, foot: [1, -0.3] };
  const back: SidePose = { shoulder, elbow, wrist, hip, knee: backKnee, ankle: backAnkle, foot: [0.5, -1] };
  return lead === "left" ? { left: front, right: back } : { left: back, right: front };
}

function curlSide(d: number, f: Faults): SidePose {
  const s = stand();
  const drift = (f.drift ?? 0) * d;
  const upperDir = fromDown(drift);
  const elbow = add(s.shoulder, mul(upperDir, UPPER));
  const elbowAngle = 170 - 132 * d;
  const wrist = add(elbow, mul(fromDown(drift + (180 - elbowAngle)), FORE));
  const lean = (f.swing ?? 0) * Math.sin(Math.PI * d);
  if (lean) {
    // Rock the torso back about the hips.
    const rot = (p: V2): V2 => {
      const r = sub(p, s.hip);
      const c = Math.cos(rad(-lean));
      const sn = Math.sin(rad(-lean));
      return add(s.hip, [r[0] * c - r[1] * sn, r[0] * sn + r[1] * c]);
    };
    return { ...s, shoulder: rot(s.shoulder), elbow: rot(elbow), wrist: rot(wrist) };
  }
  return { ...s, elbow, wrist };
}

function bridgeSide(d: number): SidePose {
  const shoulder: V2 = [0, 0.08];
  const e = 5 + 23 * d;
  const hip = add(shoulder, mul(fromFwd(e), TORSO));
  const g = 52 - 24 * d;
  const knee = add(hip, mul(fromFwd(g), THIGH));
  const drop = Math.min(SHIN, knee[1] - ANKLE_H);
  const ankle: V2 = [knee[0] + Math.sqrt(Math.max(0, SHIN * SHIN - drop * drop)), knee[1] - drop];
  return { shoulder, elbow: [0.16, 0.04], wrist: [0.42, 0.03], hip, knee, ankle, foot: [1, 0.2] };
}

function situpSide(d: number): SidePose {
  const hip: V2 = [0, 0.1];
  const knee = add(hip, mul(fromFwd(48), THIGH));
  const ankle: V2 = [knee[0] + Math.sqrt(Math.max(0, SHIN ** 2 - (knee[1] - ANKLE_H) ** 2)), ANKLE_H];
  const e = 6 + 74 * d;
  const torsoDir: V2 = [-Math.cos(rad(e)), Math.sin(rad(e))];
  const shoulder = add(hip, mul(torsoDir, TORSO));
  // Arms crossed over the chest.
  const chestOut: V2 = [torsoDir[1], -torsoDir[0]];
  const elbow = add(add(shoulder, mul(torsoDir, -0.2)), mul(chestOut, 0.1));
  const wrist = add(add(shoulder, mul(torsoDir, -0.04)), mul(chestOut, 0.12));
  return { shoulder, elbow, wrist, hip, knee, ankle, foot: [1, 0.3] };
}

function wallSitSide(f: Faults): SidePose {
  const k = 90 + (f.high ?? 0) * 40;
  const ankle: V2 = [0.44, ANKLE_H];
  const knee: V2 = [0.44, ANKLE_H + SHIN];
  const hip = add(knee, [-THIGH * Math.cos(rad(k - 90)), THIGH * Math.sin(rad(k - 90))]);
  const shoulder = add(hip, [0, TORSO]);
  return { shoulder, elbow: add(shoulder, [0.04, -UPPER]), wrist: add(shoulder, [0.12, -UPPER - FORE + 0.05]), hip, knee, ankle, foot: [1, -0.3] };
}

function highKneeSide(d: number): SidePose {
  const s = stand();
  const aT = 95 * d;
  const knee = add(s.hip, mul(fromDown(aT), THIGH));
  const ankle = add(knee, mul(fromDown(Math.max(0, aT - 75)), SHIN));
  return { ...s, knee, ankle, foot: [1, -0.6] };
}

/** Linear blend of two poses, joint by joint. */
function mix(a: SidePose, b: SidePose, k: number): SidePose {
  const m = (p: V2, q: V2): V2 => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  return { shoulder: m(a.shoulder, b.shoulder), elbow: m(a.elbow, b.elbow), wrist: m(a.wrist, b.wrist), hip: m(a.hip, b.hip), knee: m(a.knee, b.knee), ankle: m(a.ankle, b.ankle), foot: k < 0.5 ? a.foot : b.foot };
}

/** Burpee: standing (d=0) → folded with hands on the floor (d≈0.35) → plank (d≥0.7). */
function burpeeSide(d: number, f: Faults): SidePose {
  const s = stand();
  const fold = squatSide(1, { lean: 52 });
  fold.wrist = [0.38, 0.04];
  fold.elbow = [0.34, 0.3];
  const plankTop = pushupSide(0, f);
  const shift = (p: V2): V2 => [p[0] + 0.38, p[1]];
  const plank: SidePose = { shoulder: shift(plankTop.shoulder), elbow: shift(plankTop.elbow), wrist: shift(plankTop.wrist), hip: shift(plankTop.hip), knee: shift(plankTop.knee), ankle: shift(plankTop.ankle), foot: plankTop.foot };
  const reach = f.short ?? 1; // < 1: feet don't go all the way back
  if (d < 0.35) return mix(s, fold, smooth(d / 0.35));
  return mix(fold, plank, smooth(Math.min(1, (d - 0.35) / 0.35)) * reach);
}

export type View = "side" | "front" | "angled";

export interface PoseSpec {
  exerciseId: string;
  /** Rep progress 0..1 for both sides, or per side for alternating exercises. */
  d: number;
  dL?: number;
  dR?: number;
  /** Which leg leads in a lunge. */
  lead?: "left" | "right";
  faults?: Faults;
}

function buildBody(spec: PoseSpec): BodyPose {
  const f = spec.faults ?? {};
  const d = spec.d;
  switch (spec.exerciseId) {
    case "pushup": {
      const p = pushupSide(d, f);
      const flare = (f.flare ?? 0) * d;
      return { left: p, right: p, wide: { shoulder: SH_W, elbow: SH_W + 0.03 + 0.22 * flare, wrist: SH_W + 0.07, hip: HIP_W, knee: HIP_W, ankle: 0.08 } };
    }
    case "plank": {
      const p = plankSide(f);
      return { left: p, right: p, wide: { shoulder: SH_W, elbow: SH_W, wrist: SH_W - 0.04, hip: HIP_W, knee: HIP_W, ankle: 0.08 } };
    }
    case "squat": {
      const p = squatSide(d, f);
      const cave = (f.cave ?? 0) * d;
      return { left: p, right: p, wide: { shoulder: SH_W, elbow: SH_W, wrist: SH_W - 0.03, hip: HIP_W, knee: 0.17 - 0.13 * cave, ankle: 0.17 } };
    }
    case "lunge": {
      const p = lungePose(d, spec.lead ?? "left", f);
      return { ...p, wide: { shoulder: SH_W, elbow: SH_W + 0.02, wrist: SH_W + 0.04, hip: HIP_W, knee: HIP_W, ankle: 0.1 } };
    }
    case "curl": {
      const l = curlSide(spec.dL ?? d, f);
      const r = curlSide(spec.dR ?? d, f);
      return { left: l, right: r, wide: { shoulder: SH_W, elbow: SH_W + 0.01, wrist: SH_W + 0.02, hip: HIP_W, knee: HIP_W, ankle: 0.1 } };
    }
    case "press": {
      const s = stand();
      const e = 85 * d;
      const fa = 90 - 4 * d;
      const elbowLat = SH_W + UPPER * Math.cos(rad(e));
      const elbowU = s.shoulder[1] + UPPER * Math.sin(rad(e));
      const uneven = f.uneven ?? 0;
      const wristLat = elbowLat + FORE * Math.cos(rad(fa));
      const wristU = elbowU + FORE * Math.sin(rad(fa));
      const left: SidePose = { ...s, elbow: [0.04, elbowU], wrist: [0.04, wristU] };
      const lowered = Math.max(0, d - uneven);
      const e2 = 85 * lowered;
      const elbowU2 = s.shoulder[1] + UPPER * Math.sin(rad(e2));
      const right: SidePose = { ...s, elbow: [0.04, elbowU2], wrist: [0.04, elbowU2 + FORE * Math.sin(rad(90 - 4 * lowered))] };
      return {
        left,
        right,
        wide: { shoulder: SH_W, hip: HIP_W, knee: HIP_W, ankle: 0.1 },
        latL: { elbow: elbowLat, wrist: wristLat },
        latR: { elbow: SH_W + UPPER * Math.cos(rad(e2)), wrist: SH_W + UPPER * Math.cos(rad(e2)) + FORE * Math.cos(rad(90 - 4 * lowered)) },
      };
    }
    case "lateral-raise": {
      const s = stand();
      const a = 12 + 78 * d * (1 + (f.high ?? 0) * 0.5);
      const arm = UPPER + FORE;
      const lat = (k: number) => SH_W + k * Math.sin(rad(a));
      const u = (k: number) => s.shoulder[1] - k * Math.cos(rad(a));
      const side: SidePose = { ...s, elbow: [0.02, u(UPPER)], wrist: [0.04, u(arm)] };
      return { left: side, right: side, wide: { shoulder: SH_W, hip: HIP_W, knee: HIP_W, ankle: 0.1 }, latL: { elbow: lat(UPPER), wrist: lat(arm) }, latR: { elbow: lat(UPPER), wrist: lat(arm) } };
    }
    case "jumping-jack": {
      const s = stand();
      const a = 12 + 160 * d * (f.arms ?? 1);
      const arm = UPPER + FORE;
      const lat = (k: number) => SH_W + k * Math.sin(rad(a));
      const u = (k: number) => s.shoulder[1] - k * Math.cos(rad(a));
      const feet = 0.07 + 0.27 * d * (f.legs ?? 1);
      const legLat = (frac: number) => HIP_W + (feet - HIP_W) * frac;
      const legDrop = Math.sqrt(Math.max(0, (THIGH + SHIN) ** 2 - (feet - HIP_W) ** 2));
      const hipU = ANKLE_H + legDrop;
      const side: SidePose = {
        shoulder: [0, hipU + TORSO],
        elbow: [0, u(UPPER) - (s.hip[1] - hipU)],
        wrist: [0, u(arm) - (s.hip[1] - hipU)],
        hip: [0, hipU],
        knee: [0.01, ANKLE_H + legDrop * (SHIN / (THIGH + SHIN))],
        ankle: [0, ANKLE_H],
        foot: [1, -0.3],
      };
      const lats = { shoulder: SH_W, elbow: lat(UPPER), wrist: lat(arm), hip: HIP_W, knee: legLat(THIGH / (THIGH + SHIN)), ankle: feet };
      return { left: side, right: side, latL: lats, latR: lats };
    }
    case "bridge": {
      const p = bridgeSide(d);
      return { left: p, right: p, wide: { shoulder: SH_W, elbow: SH_W + 0.03, wrist: SH_W + 0.04, hip: HIP_W, knee: HIP_W + 0.02, ankle: HIP_W + 0.02 } };
    }
    case "situp": {
      const p = situpSide(d);
      return { left: p, right: p, wide: { shoulder: SH_W, elbow: 0.1, wrist: -0.12, hip: HIP_W, knee: HIP_W, ankle: HIP_W } };
    }
    case "high-knees": {
      const l = highKneeSide(spec.dL ?? 0);
      const r = highKneeSide(spec.dR ?? 0);
      return { left: l, right: r, wide: { shoulder: SH_W, elbow: SH_W + 0.02, wrist: SH_W + 0.02, hip: HIP_W, knee: HIP_W, ankle: HIP_W } };
    }
    case "burpee": {
      const p = burpeeSide(d, f);
      return { left: p, right: p, wide: { shoulder: SH_W, elbow: SH_W + 0.02, wrist: SH_W + 0.04, hip: HIP_W, knee: HIP_W, ankle: 0.09 } };
    }
    case "wall-sit": {
      const p = wallSitSide(f);
      return { left: p, right: p, wide: { shoulder: SH_W, elbow: SH_W, wrist: SH_W - 0.04, hip: HIP_W, knee: HIP_W + 0.03, ankle: HIP_W + 0.03 } };
    }
    default:
      return { left: stand(), right: stand(), wide: { shoulder: SH_W, elbow: SH_W, wrist: SH_W, hip: HIP_W, knee: HIP_W, ankle: HIP_W } };
  }
}

/** The 33 MediaPipe points in the body frame (F, U, W), W positive toward the person's left. */
function bodyPoints(spec: PoseSpec): [number, number, number][] {
  const b = buildBody(spec);
  const lat = (side: "left" | "right", joint: keyof SidePose): number => {
    const over = side === "left" ? b.latL?.[joint] : b.latR?.[joint];
    const extra = side === "left" ? b.wideL?.[joint] : b.wideR?.[joint];
    const w = over ?? extra ?? b.wide?.[joint] ?? 0.1;
    return side === "left" ? w : -w;
  };
  const P = (side: "left" | "right", joint: keyof SidePose): [number, number, number] => {
    const v = b[side][joint] as V2;
    return [v[0], v[1], lat(side, joint)];
  };
  const pts: [number, number, number][] = new Array(33).fill(null).map(() => [0, 0, 0]);
  const sides = ["left", "right"] as const;
  const idx = {
    left: { shoulder: 11, elbow: 13, wrist: 15, pinky: 17, index: 19, thumb: 21, hip: 23, knee: 25, ankle: 27, heel: 29, toe: 31 },
    right: { shoulder: 12, elbow: 14, wrist: 16, pinky: 18, index: 20, thumb: 22, hip: 24, knee: 26, ankle: 28, heel: 30, toe: 32 },
  };
  for (const s of sides) {
    const I = idx[s];
    const sh = P(s, "shoulder");
    const el = P(s, "elbow");
    const wr = P(s, "wrist");
    pts[I.shoulder] = sh;
    pts[I.elbow] = el;
    pts[I.wrist] = wr;
    const fdir = [wr[0] - el[0], wr[1] - el[1], wr[2] - el[2]];
    const fl = Math.hypot(fdir[0]!, fdir[1]!, fdir[2]!) || 1;
    const hand = (k: number, w: number): [number, number, number] => [wr[0] + (fdir[0]! / fl) * k, wr[1] + (fdir[1]! / fl) * k, wr[2] + w * (s === "left" ? 1 : -1)];
    pts[I.pinky] = hand(0.07, 0.02);
    pts[I.index] = hand(0.08, -0.01);
    pts[I.thumb] = hand(0.04, -0.03);
    const hp = P(s, "hip");
    const kn = P(s, "knee");
    const an = P(s, "ankle");
    pts[I.hip] = hp;
    pts[I.knee] = kn;
    pts[I.ankle] = an;
    const foot = norm((b[s].foot ?? [1, -0.3]) as V2);
    pts[I.toe] = [an[0] + foot[0] * 0.15, an[1] + foot[1] * 0.15 - 0.03, an[2]];
    pts[I.heel] = [an[0] - foot[0] * 0.05, an[1] - foot[1] * 0.05 - 0.04, an[2]];
  }
  // Head, placed from the torso direction.
  const sm: V2 = [(b.left.shoulder[0] + b.right.shoulder[0]) / 2, (b.left.shoulder[1] + b.right.shoulder[1]) / 2];
  const hm: V2 = [(b.left.hip[0] + b.right.hip[0]) / 2, (b.left.hip[1] + b.right.hip[1]) / 2];
  const up = norm(sub(sm, hm));
  const face: V2 = [up[1], -up[0]];
  const head = add(add(sm, mul(up, 0.2)), mul(face, 0.03));
  const nose = add(head, mul(face, 0.09));
  const at = (p: V2, w: number): [number, number, number] => [p[0], p[1], w];
  pts[0] = at(nose, 0);
  const eye = add(add(nose, mul(up, 0.035)), mul(face, -0.02));
  pts[1] = at(eye, 0.02);
  pts[2] = at(eye, 0.035);
  pts[3] = at(eye, 0.05);
  pts[4] = at(eye, -0.02);
  pts[5] = at(eye, -0.035);
  pts[6] = at(eye, -0.05);
  const ear = add(head, mul(face, -0.01));
  pts[7] = at(ear, 0.075);
  pts[8] = at(ear, -0.075);
  const mouth = add(nose, mul(up, -0.04));
  pts[9] = at(mouth, 0.025);
  pts[10] = at(mouth, -0.025);
  return pts;
}

/** Scene coordinates: X to the camera's right, Y up, Z toward the camera. */
function toScene(p: [number, number, number], yawDeg: number): Point3 {
  const [F, U, W] = p;
  const s = Math.sin(rad(yawDeg));
  const c = Math.cos(rad(yawDeg));
  // Forward = (sin, 0, cos); the person's left = (cos, 0, -sin).
  return { x: F * s + W * c, y: U, z: F * c - W * s };
}

export function yawFor(view: View): number {
  return view === "front" ? 0 : view === "side" ? 90 : 45;
}

/** One pose, in scene coordinates. */
export function scenePose(spec: PoseSpec, view: View): Point3[] {
  const yaw = yawFor(view);
  return bodyPoints(spec).map((p) => toScene(p, yaw));
}

/** Seeded random numbers, so a generated set is the same every run. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SynthOptions {
  view?: View;
  fps?: number;
  reps?: number;
  /** Duration of one rep, top to top. */
  repMs?: number;
  /** Pause at the top between reps. */
  restMs?: number;
  /** Time in the start position before the first rep. */
  leadMs?: number;
  /** Time after the last rep. */
  tailMs?: number;
  /** Peak progress of each rep (1 = full depth). A function lets depth vary rep to rep. */
  depth?: number | ((rep: number) => number);
  /** Faults, per rep or constant. */
  faults?: Faults | ((rep: number) => Faults);
  /** For alternating exercises: curl both arms together (true) or alternate (false). */
  together?: boolean;
  noisePx?: number;
  seed?: number;
  width?: number;
  height?: number;
  /** Visibility the model gives the side facing away from the camera. */
  farVisibility?: number;
  /** For holds: total duration. */
  holdMs?: number;
}

/**
 * A whole set as camera frames: start position, `reps` reps, then rest.
 * Landmarks come out in image pixels with the camera framed on the person,
 * plus a hip-centred world estimate like MediaPipe's.
 */
export function synthesize(exerciseId: string, o: SynthOptions = {}): PoseFrame[] {
  const view = o.view ?? "side";
  const fps = o.fps ?? 30;
  const reps = o.reps ?? 5;
  const repMs = o.repMs ?? 2000;
  const restMs = o.restMs ?? 400;
  const leadMs = o.leadMs ?? 1500;
  const tailMs = o.tailMs ?? 1200;
  const width = o.width ?? 1280;
  const height = o.height ?? 720;
  const rand = rng(o.seed ?? 7);
  const gauss = () => {
    const u = 1 - rand();
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const alternating = exerciseId === "lunge" || exerciseId === "high-knees" || (exerciseId === "curl" && o.together === false);
  const isHold = exerciseId === "plank" || exerciseId === "wall-sit";
  const total = isHold ? leadMs + (o.holdMs ?? 10000) + tailMs : leadMs + reps * (repMs + restMs) + tailMs;
  const depthOf = (r: number) => (typeof o.depth === "function" ? o.depth(r) : (o.depth ?? 1));
  const faultsOf = (r: number) => (typeof o.faults === "function" ? o.faults(r) : (o.faults ?? {}));

  const specs: PoseSpec[] = [];
  const times: number[] = [];
  for (let t = 0; t <= total; t += 1000 / fps) {
    times.push(t);
    let d = 0;
    let rep = 0;
    if (!isHold && t >= leadMs && t < leadMs + reps * (repMs + restMs)) {
      const k = t - leadMs;
      rep = Math.floor(k / (repMs + restMs));
      const within = k - rep * (repMs + restMs);
      const x = within / repMs;
      // Down for 45%, a short pause at the bottom, up for 45%.
      d = x >= 1 ? 0 : x < 0.45 ? smooth(x / 0.45) : x < 0.55 ? 1 : smooth(1 - (x - 0.55) / 0.45);
      d *= depthOf(rep);
    }
    const faults = isHold ? faultsOf(Math.floor(Math.max(0, t - leadMs) / 1000)) : faultsOf(rep);
    const spec: PoseSpec = { exerciseId, d, faults };
    if (alternating) {
      const leftTurn = rep % 2 === 0;
      spec.dL = leftTurn ? d : 0;
      spec.dR = leftTurn ? 0 : d;
      spec.lead = leftTurn ? "left" : "right";
      if (exerciseId !== "curl") spec.d = d;
    }
    specs.push(spec);
  }

  // Frame the camera on everything the person does in the set.
  const scenes = specs.map((s) => scenePose(s, view));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const sc of scenes) for (const p of sc) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  const scale = Math.min((width * 0.8) / (x1 - x0 || 1), (height * 0.8) / (y1 - y0 || 1));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const far = o.farVisibility ?? 0.7;
  const yaw = yawFor(view);
  // Which side faces the camera: the person's left faces it when their left axis has positive Z.
  const leftNear = -Math.sin(rad(yaw)) > 0 ? true : Math.sin(rad(yaw)) > 0 ? false : null;
  const noise = o.noisePx ?? 1.5;

  return scenes.map((sc, i) => {
    const landmarks: Landmark[] = sc.map((p, j) => {
      const isLeft = j >= 11 ? j % 2 === 1 : [1, 2, 3, 7, 9].includes(j);
      const isRight = j >= 11 ? j % 2 === 0 : [4, 5, 6, 8, 10].includes(j);
      let vis = 0.98;
      if (leftNear !== null && view === "side") {
        if ((isLeft && !leftNear) || (isRight && leftNear)) vis = far;
      }
      return {
        x: width / 2 + (p.x - cx) * scale + gauss() * noise,
        y: height / 2 - (p.y - cy) * scale + gauss() * noise,
        visibility: vis,
      };
    });
    const hc = { x: (sc[23]!.x + sc[24]!.x) / 2, y: (sc[23]!.y + sc[24]!.y) / 2, z: (sc[23]!.z + sc[24]!.z) / 2 };
    const world: Point3[] = sc.map((p) => ({
      x: p.x - hc.x + gauss() * 0.008,
      y: -(p.y - hc.y) + gauss() * 0.008,
      z: -(p.z - hc.z) + gauss() * 0.015,
    }));
    return { t: times[i] as number, width, height, landmarks, world, people: 1 };
  });
}

/** Normalised 2D points (0..1, y down) for drawing a demo figure at progress d. */
export function demoPose(spec: PoseSpec, view: View): { x: number; y: number }[] {
  const sc = scenePose(spec, view);
  return sc.map((p) => ({ x: p.x, y: -p.y }));
}
