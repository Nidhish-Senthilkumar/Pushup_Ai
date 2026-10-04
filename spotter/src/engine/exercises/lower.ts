import type { Body } from "../body";
import type { HoldExercise, RepExercise } from "../exercise";
import { angle, dist } from "../geometry";
import { LM, type Side } from "../types";
import { bySide, eitherSide, falling, jointAngle, rising, segment, sideVisible, torsoLean } from "./helpers";

const L = LM;

/**
 * Hip height above the knee, as a share of shin length. Standing, the thigh
 * hangs straight so this is about 1; at parallel the hip is level with the
 * knee and it's 0. Measured vertically, it reads the same from the front and
 * the side, and the shin (which stays near vertical) is a scale that doesn't
 * shrink when the thigh tips toward the camera.
 */
function hipAboveKnee(body: Body, s: Side): number {
  const shin = segment(body, s, "knee", "ankle") || 1;
  return (body.j(s, "knee").y - body.j(s, "hip").y) / shin;
}

/** Bodyweight squat, from the front or the side. The booth favourite: no floor work needed. */
export const squat: RepExercise = {
  id: "squat",
  name: "Squat",
  kind: "reps",
  category: "lower",
  muscles: ["Quads", "Glutes", "Hamstrings", "Core"],
  blurb: "Sit back and stand tall. Cadence measures depth and catches knees caving in.",
  steps: [
    "Feet shoulder-width apart, toes turned out slightly.",
    "Push your hips back and bend your knees like sitting into a chair.",
    "Go down until your thighs are level with the floor, chest up.",
    "Drive through your heels to stand up tall.",
  ],
  easier: "Squat to a chair and stand back up.",
  harder: "Pause for 2 seconds at the bottom, or jump at the top.",
  met: 5,
  setup: {
    view: "any",
    posture: "standing",
    required: [eitherSide("shoulder", "hip", "knee", "ankle")],
    placement: "Put the camera at waist height 2 to 3 metres away, facing you or from the side.",
    startPose: (m) => m.p < 0.2,
    startHint: "Stand tall, feet shoulder-width apart",
  },
  enterAt: 0.25,
  exitAt: 0.12,
  countAt: 0.45,
  depthAt: 0.82,
  minRepMs: 1000,
  depthLabel: "squat depth",
  shallowCue: "Squat deeper",
  shallowTip: "Lower until your thighs are level with the floor. Sitting back to a chair helps you find the depth.",
  measure(body: Body) {
    const v = bySide(body, ["hip", "knee", "ankle"], (s) => hipAboveKnee(body, s));
    if (!v) return null;
    const view = body.view();
    const near = body.nearSide(["shoulder", "hip", "knee", "ankle"]);
    const lean = sideVisible(body, near, ["shoulder", "hip"]) ? torsoLean(body, near) : NaN;
    const knee = sideVisible(body, near, ["hip", "knee", "ankle"]) ? jointAngle(body, near, "hip", "knee", "ankle", view === "side") : NaN;
    // Knees caving in, only measurable from the front: knee gap compared with ankle gap.
    let cave = NaN;
    if (view === "front" && body.visible(L.leftKnee, L.rightKnee, L.leftAnkle, L.rightAnkle)) {
      const kneeGap = Math.abs(body.p(L.leftKnee).x - body.p(L.rightKnee).x);
      const ankleGap = Math.abs(body.p(L.leftAnkle).x - body.p(L.rightAnkle).x) || 1;
      cave = kneeGap / ankleGap;
    }
    return { p: falling(v.mean, 1.0, 0.12), hipKnee: v.mean, lean: view === "side" ? lean : NaN, knee, cave, front: view === "front" ? 1 : 0 };
  },
  checks: [
    {
      id: "knees-cave",
      title: "Knees caving in",
      cue: "Push your knees out",
      tip: "Your knees collapsed inward on the way up. Push them out over your toes, as if spreading the floor apart with your feet.",
      joints: [L.leftKnee, L.rightKnee],
      major: true,
      kind: "live",
      holdMs: 250,
      live: (m) => (Number.isFinite(m.cave) && m.p > 0.45 ? m.cave < 0.72 : null),
    },
    {
      id: "chest-down",
      title: "Chest falling forward",
      cue: "Chest up",
      tip: "You folded forward at the bottom. Keep your chest proud and your eyes forward, and sit your hips back rather than down.",
      joints: [L.leftShoulder, L.rightShoulder, L.leftHip, L.rightHip],
      major: false,
      kind: "rep",
      rep: (r) => Number.isFinite(r.atPeak.lean) && r.atPeak.lean > 58,
    },
  ],
};

/** Forward or reverse lunge. Each leg counts as a rep. */
export const lunge: RepExercise = {
  id: "lunge",
  name: "Lunge",
  kind: "reps",
  category: "lower",
  muscles: ["Quads", "Glutes", "Hamstrings", "Balance"],
  blurb: "Alternate legs. Cadence checks your front knee depth and keeps your torso tall.",
  steps: [
    "Stand tall, feet hip-width apart.",
    "Step one foot forward and lower your back knee toward the floor.",
    "Go down until your front knee is bent to about 90 degrees.",
    "Push back up to standing and switch legs.",
  ],
  easier: "Hold onto a chair for balance, or don't go as low.",
  harder: "Hold weights, or add a jump between legs.",
  met: 3.8,
  setup: {
    view: "side",
    posture: "standing",
    required: [eitherSide("shoulder", "hip", "knee", "ankle")],
    placement: "Put the camera at waist height 2 to 3 metres to your side, with room for a big step forward.",
    startPose: (m) => m.p < 0.2,
    startHint: "Stand tall, feet together",
  },
  enterAt: 0.25,
  exitAt: 0.12,
  countAt: 0.45,
  depthAt: 0.85,
  minRepMs: 1000,
  depthLabel: "lunge depth",
  shallowCue: "Lower your back knee",
  shallowTip: "Drop your back knee toward the floor until your front knee reaches about 90 degrees.",
  measure(body: Body) {
    const sideView = body.view() !== "front";
    const k = bySide(body, ["hip", "knee", "ankle"], (s) => jointAngle(body, s, "hip", "knee", "ankle", sideView));
    if (!k) return null;
    const vals = [k.left, k.right].filter(Number.isFinite);
    const front = Math.min(...vals);
    const near = body.nearSide(["shoulder", "hip"]);
    const lean = sideVisible(body, near, ["shoulder", "hip"]) ? torsoLean(body, near) : NaN;
    return { p: falling(front, 165, 95), knee: front, lean };
  },
  checks: [
    {
      id: "lean",
      title: "Leaning forward",
      cue: "Stay tall",
      tip: "Your torso tipped forward. Keep your shoulders stacked over your hips, as if a string pulls the top of your head up.",
      joints: [L.leftShoulder, L.rightShoulder, L.leftHip, L.rightHip],
      major: false,
      kind: "rep",
      rep: (r) => Number.isFinite(r.atPeak.lean) && r.atPeak.lean > 30,
    },
  ],
};

/** Glute bridge, lying on your back, filmed from the side. */
export const bridge: RepExercise = {
  id: "bridge",
  name: "Glute bridge",
  kind: "reps",
  category: "lower",
  muscles: ["Glutes", "Hamstrings", "Lower back"],
  blurb: "Drive your hips up to a straight line. Cadence checks you finish every rep.",
  steps: [
    "Lie on your back, knees bent, feet flat and hip-width apart.",
    "Press through your heels and squeeze your glutes.",
    "Lift your hips until your body is straight from shoulders to knees.",
    "Lower slowly back to the floor.",
  ],
  easier: "Smaller range, with a pause at the top.",
  harder: "One leg at a time, or a weight on your hips.",
  met: 3.5,
  setup: {
    view: "side",
    posture: "lying",
    required: [eitherSide("shoulder", "hip", "knee", "ankle")],
    placement: "Put the camera on the floor about 2 metres to your side.",
    startPose: (m) => m.p < 0.25,
    startHint: "Lie on your back with your knees bent",
  },
  enterAt: 0.3,
  exitAt: 0.15,
  countAt: 0.5,
  depthAt: 0.85,
  minRepMs: 900,
  depthLabel: "hip lift",
  shallowCue: "Hips higher",
  shallowTip: "Lift until your shoulders, hips and knees make one straight line, then squeeze your glutes.",
  measure(body: Body) {
    const side = body.nearSide(["shoulder", "hip", "knee"]);
    if (!sideVisible(body, side, ["shoulder", "hip", "knee"])) return null;
    const hip = angle(body.j(side, "shoulder"), body.j(side, "hip"), body.j(side, "knee"));
    return { p: rising(hip, 138, 168), hip };
  },
  checks: [],
};

/** Wall sit, a hold filmed from the side. */
export const wallSit: HoldExercise = {
  id: "wall-sit",
  name: "Wall sit",
  kind: "hold",
  category: "lower",
  muscles: ["Quads", "Glutes"],
  blurb: "Hold a chair position against a wall. The timer only runs while your thighs are level.",
  steps: [
    "Stand with your back flat against a wall.",
    "Walk your feet out and slide down until your knees bend to 90 degrees.",
    "Keep your back on the wall and your thighs level with the floor.",
    "Hold, breathing steadily.",
  ],
  easier: "Slide down only halfway.",
  harder: "Hold a weight on your lap, or lift one foot.",
  met: 3.8,
  setup: {
    view: "side",
    posture: "any",
    required: [eitherSide("shoulder", "hip", "knee", "ankle")],
    placement: "Put the camera at knee height 2 metres to your side.",
    startPose: (m) => m.knee < 125 && m.knee > 60,
    startHint: "Slide down the wall until your knees bend",
  },
  inPosition: (m) => m.knee < 125 && m.knee > 60 && m.lean < 40,
  measure(body: Body) {
    const side = body.nearSide(["shoulder", "hip", "knee", "ankle"]);
    if (!sideVisible(body, side, ["shoulder", "hip", "knee", "ankle"])) return null;
    const knee = angle(body.j(side, "hip"), body.j(side, "knee"), body.j(side, "ankle"));
    const lean = torsoLean(body, side);
    const thigh = dist(body.j(side, "hip"), body.j(side, "knee")) || 1;
    const level = (body.j(side, "knee").y - body.j(side, "hip").y) / thigh;
    return { p: 0, knee, lean, level };
  },
  checks: [
    {
      id: "too-high",
      title: "Sitting too high",
      cue: "Slide lower",
      tip: "Your thighs weren't level with the floor. Walk your feet out a little and slide down until your knees reach 90 degrees.",
      joints: [L.leftKnee, L.rightKnee, L.leftHip, L.rightHip],
      major: true,
      kind: "live",
      holdMs: 600,
      live: (m) => m.knee > 112,
    },
  ],
};


