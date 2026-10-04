import { angle, angle3, dist, dist3, mid, mid3 } from "./geometry";
import { LM, type Landmark, type Point, type Point3, type PoseFrame, type Side } from "./types";

/**
 * A read-only view of one frame's skeleton with the measurements every
 * exercise needs: which side faces the camera, joint angles, segment lengths
 * and whether the camera sees the person from the front or the side.
 */

export const VISIBLE = 0.5;

const SIDE_IDX = {
  left: { shoulder: LM.leftShoulder, elbow: LM.leftElbow, wrist: LM.leftWrist, hip: LM.leftHip, knee: LM.leftKnee, ankle: LM.leftAnkle, ear: LM.leftEar, heel: LM.leftHeel, toe: LM.leftFootIndex },
  right: { shoulder: LM.rightShoulder, elbow: LM.rightElbow, wrist: LM.rightWrist, hip: LM.rightHip, knee: LM.rightKnee, ankle: LM.rightAnkle, ear: LM.rightEar, heel: LM.rightHeel, toe: LM.rightFootIndex },
} as const;

export type Joint = keyof (typeof SIDE_IDX)["left"];

export function jointIndex(side: Side, joint: Joint): number {
  return SIDE_IDX[side][joint];
}

export type ViewKind = "front" | "side" | "angled";

export class Body {
  readonly lm: Landmark[];
  readonly world: Point3[] | undefined;
  readonly width: number;
  readonly height: number;
  readonly t: number;

  constructor(frame: PoseFrame) {
    this.lm = frame.landmarks;
    this.world = frame.world && frame.world.length === frame.landmarks.length ? frame.world : undefined;
    this.width = frame.width;
    this.height = frame.height;
    this.t = frame.t;
  }

  get present(): boolean {
    return this.lm.length >= 33;
  }

  p(i: number): Landmark {
    return this.lm[i] as Landmark;
  }

  w(i: number): Point3 | undefined {
    return this.world?.[i];
  }

  vis(i: number): number {
    return this.lm[i]?.visibility ?? 0;
  }

  visible(...idx: number[]): boolean {
    return idx.every((i) => this.vis(i) >= VISIBLE);
  }

  /** Mean visibility of a set of landmarks. */
  visScore(idx: number[]): number {
    return idx.reduce((s, i) => s + this.vis(i), 0) / idx.length;
  }

  j(side: Side, joint: Joint): Landmark {
    return this.p(SIDE_IDX[side][joint]);
  }

  jw(side: Side, joint: Joint): Point3 | undefined {
    return this.w(SIDE_IDX[side][joint]);
  }

  /**
   * The side of the body nearer the camera, judged by how sure the model is
   * of each side's joints. In a side view the far arm and leg are hidden and
   * their positions are guesses, so measurements use the near side.
   */
  nearSide(joints: Joint[] = ["shoulder", "elbow", "wrist", "hip", "knee", "ankle"]): Side {
    const score = (s: Side) => joints.reduce((sum, j) => sum + this.vis(SIDE_IDX[s][j]), 0);
    return score("left") >= score("right") ? "left" : "right";
  }

  /** 2D angle at the middle joint, on one side. */
  angle2(side: Side, a: Joint, b: Joint, c: Joint): number {
    return angle(this.j(side, a), this.j(side, b), this.j(side, c));
  }

  /** 3D angle at the middle joint from the metric world estimate, or the 2D angle when there is none. */
  angle3(side: Side, a: Joint, b: Joint, c: Joint): number {
    const wa = this.jw(side, a);
    const wb = this.jw(side, b);
    const wc = this.jw(side, c);
    if (wa && wb && wc) return angle3(wa, wb, wc);
    return this.angle2(side, a, b, c);
  }

  shoulderMid(): Point {
    return mid(this.p(LM.leftShoulder), this.p(LM.rightShoulder));
  }

  hipMid(): Point {
    return mid(this.p(LM.leftHip), this.p(LM.rightHip));
  }

  kneeMid(): Point {
    return mid(this.p(LM.leftKnee), this.p(LM.rightKnee));
  }

  ankleMid(): Point {
    return mid(this.p(LM.leftAnkle), this.p(LM.rightAnkle));
  }

  /** Shoulder-to-hip distance in pixels, the scale reference for everything else. */
  torsoPx(): number {
    return dist(this.shoulderMid(), this.hipMid());
  }

  /** Shoulder-to-hip distance in metres from the world estimate. Foreshortening doesn't shrink it. */
  torsoWorld(): number | null {
    if (!this.world) return null;
    const s = mid3(this.world[LM.leftShoulder]!, this.world[LM.rightShoulder]!);
    const h = mid3(this.world[LM.leftHip]!, this.world[LM.rightHip]!);
    return dist3(s, h);
  }

  /**
   * Is the camera looking at the person's front (or back), their side, or in
   * between? Shoulder width compared with torso length in the image is the
   * main signal; the world estimate's depth gap between the shoulders backs
   * it up when the person is lying down and the torso itself is foreshortened.
   */
  view(): ViewKind {
    const ls = this.p(LM.leftShoulder);
    const rs = this.p(LM.rightShoulder);
    const lh = this.p(LM.leftHip);
    const rh = this.p(LM.rightHip);
    const shoulderW = dist(ls, rs);
    const hipW = dist(lh, rh);
    const torso = this.torsoPx() || 1;
    const ratio = Math.max(shoulderW, hipW * 1.25) / torso;
    if (this.world) {
      const a = this.world[LM.leftShoulder]!;
      const b = this.world[LM.rightShoulder]!;
      const len = dist3(a, b) || 1;
      const depthShare = Math.abs(a.z - b.z) / len;
      if (depthShare > 0.8 && ratio < 0.6) return "side";
      if (depthShare < 0.45 && ratio > 0.45) return "front";
    }
    if (ratio < 0.35) return "side";
    if (ratio > 0.6) return "front";
    return "angled";
  }

  /** Shoulder to hip to knee to ankle on one side, in pixels: the body's length whatever its posture. */
  chainPx(side: Side): number {
    const seg = (a: Joint, b: Joint) => (this.vis(SIDE_IDX[side][a]) >= 0.3 && this.vis(SIDE_IDX[side][b]) >= 0.3 ? dist(this.j(side, a), this.j(side, b)) : 0);
    return seg("shoulder", "hip") + seg("hip", "knee") + seg("knee", "ankle");
  }

  /** Box around every confidently seen landmark, in pixels. */
  bounds(minVis = VISIBLE): { x0: number; y0: number; x1: number; y1: number } | null {
    const seen = this.lm.filter((p) => p.visibility >= minVis);
    if (seen.length < 4) return null;
    const xs = seen.map((p) => p.x);
    const ys = seen.map((p) => p.y);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  }

  /**
   * Torso angle from vertical in degrees: 0 standing upright, 90 lying flat.
   * From the metric world estimate when there is one, because it doesn't
   * depend on where the camera is (a push-up filmed from the front looks
   * vertical in the picture); otherwise from the picture.
   */
  torsoTilt(): number {
    if (this.world) {
      const s = mid3(this.world[LM.leftShoulder]!, this.world[LM.rightShoulder]!);
      const h = mid3(this.world[LM.leftHip]!, this.world[LM.rightHip]!);
      const dx = s.x - h.x;
      const dy = s.y - h.y;
      const dz = s.z - h.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      // World y points down: an upright torso has the shoulders at smaller y.
      return (Math.acos(Math.max(-1, Math.min(1, -dy / len))) * 180) / Math.PI;
    }
    const s = this.shoulderMid();
    const h = this.hipMid();
    return (Math.acos(Math.max(-1, Math.min(1, (h.y - s.y) / (Math.hypot(s.x - h.x, s.y - h.y) || 1)))) * 180) / Math.PI;
  }

  /** Is the body roughly horizontal (push-up, plank, bridge) rather than upright? */
  lying(): boolean {
    const s = this.shoulderMid();
    const a = this.ankleMid();
    const h = this.hipMid();
    const span = (p: Point, q: Point) => Math.abs(p.x - q.x) / (Math.abs(p.y - q.y) + 1e-6);
    // Shoulders to ankles stretched out sideways in the frame, or (seen from the
    // feet or head) shoulders and hips at almost the same height.
    // The 3D torso angle catches lying down when the camera faces the head or
    // feet, where the picture alone shows the body end-on.
    return span(s, a) > 1.4 || (this.view() === "front" && Math.abs(s.y - h.y) < 0.35 * dist(this.p(LM.leftShoulder), this.p(LM.rightShoulder))) || (!!this.world && this.torsoTilt() > 55);
  }
}

/**
 * The team's original four features, computed exactly as in
 * data/pushupcamera.py and MobileApp/app.py, so frames recorded in the Data
 * Lab can be appended to data/TRAINING_SET and used by ML/LSTM.py unchanged:
 * [hip angle, mean shoulder angle, mean elbow angle, mean knee angle].
 */
export function teamFeatures(frame: PoseFrame): [number, number, number, number] | null {
  const lm = frame.landmarks;
  if (lm.length < 33) return null;
  // The Python code uses MediaPipe's normalised coordinates; angles are the
  // same in pixels only when the aspect ratio is 1, so normalise first.
  const P = (i: number): Point => ({ x: (lm[i] as Landmark).x / frame.width, y: (lm[i] as Landmark).y / frame.height });
  const rS = P(12), rE = P(14), rW = P(16), rH = P(24), rK = P(26), rA = P(28);
  const lS = P(11), lE = P(13), lW = P(15), lH = P(23), lK = P(25), lA = P(27);
  const mHip = mid(rH, lH);
  const mKnee = mid(rK, lK);
  const mShoulder = mid(lS, rS);
  const rShoulderAng = 180 - angle(rH, rS, rE);
  const lShoulderAng = 180 - angle(lH, lS, lE);
  const hipAng = angle(mKnee, mHip, mShoulder);
  const rKneeAng = angle(rH, rK, rA);
  const lKneeAng = angle(lH, lK, lA);
  const rElbowAng = angle(rW, rE, rS);
  const lElbowAng = angle(lW, lE, lS);
  return [hipAng, (rShoulderAng + lShoulderAng) / 2, (rElbowAng + lElbowAng) / 2, (rKneeAng + lKneeAng) / 2];
}
