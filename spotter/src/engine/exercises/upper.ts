import type { Body } from "../body";
import type { RepExercise } from "../exercise";
import { angle, angle3, dist, fromDown } from "../geometry";
import { LM, type Side } from "../types";
import { armRaise, bothSides, bySide, eitherSide, falling, hipLine, jointAngle, rising, segment, sideVisible, torsoLean } from "./helpers";

const L = LM;

/**
 * Push-up, filmed from the side. The original PushBot exercise: the four
 * fault classes the team trained on (good, elbows wide, hips high, sagging)
 * map to the checks below, measured directly instead of classified.
 */
export const pushup: RepExercise = {
  id: "pushup",
  name: "Push-up",
  kind: "reps",
  category: "upper",
  muscles: ["Chest", "Triceps", "Shoulders", "Core"],
  blurb: "The classic. Cadence checks depth, body line and tempo on every rep.",
  steps: [
    "Hands just wider than your shoulders, arms straight.",
    "Make one straight line from head to heels and brace your core.",
    "Lower until your elbows bend to about 90 degrees.",
    "Push the floor away until your arms are straight again.",
  ],
  easier: "Knee push-ups or hands on a bench. Cadence detects knee push-ups automatically.",
  harder: "Feet raised on a step, or a 3-second lowering phase.",
  met: 8,
  setup: {
    view: "any",
    posture: "lying",
    required: [eitherSide("shoulder", "elbow", "wrist", "hip"), [[L.leftAnkle], [L.rightAnkle], [L.leftKnee], [L.rightKnee]]],
    placement: "Put the camera on the floor about 2 metres to your side, so it sees you from head to feet.",
    viewTip: { when: "front", text: "Counting works from the front. For hip and body-line feedback, put the camera to your side." },
    startPose: (m) => m.p < 0.25 && !(Math.abs(m.line) >= 0.12),
    startHint: "Get into a high plank with your arms straight",
  },
  enterAt: 0.28,
  exitAt: 0.14,
  countAt: 0.5,
  depthAt: 0.86,
  minRepMs: 800,
  depthLabel: "elbow bend",
  shallowCue: "Go lower",
  shallowTip: "Lower until your elbows reach about 90 degrees. Half reps build half the strength.",
  measure(body: Body) {
    const side = body.nearSide(["shoulder", "elbow", "wrist", "hip"]);
    if (!sideVisible(body, side, ["shoulder", "elbow", "wrist", "hip"])) return null;
    // Push-ups happen with the torso near horizontal. Standing up, walking to
    // the phone or wall push-ups move the elbows too, but aren't reps.
    if (body.torsoTilt() < 45) return null;
    const kneeOk = body.vis(side === "left" ? L.leftKnee : L.rightKnee) >= 0.5;
    const ankleOk = body.vis(side === "left" ? L.leftAnkle : L.rightAnkle) >= 0.5;
    if (!kneeOk && !ankleOk) return null;
    const sideView = body.view() !== "front";
    const elbow = jointAngle(body, side, "shoulder", "elbow", "wrist", sideView);
    const knee = kneeOk && ankleOk ? angle(body.j(side, "hip"), body.j(side, "knee"), body.j(side, "ankle")) : 180;
    const kneeling = knee < 130 ? 1 : 0;
    // The body line only shows from the side; head-on it's foreshortened into noise.
    const line = sideView ? hipLine(body, side, kneeling || !ankleOk ? "knee" : "ankle") : NaN;
    // Elbow flare needs depth, so it comes from the 3D estimate: the angle
    // between the upper arm and the body. About 45 degrees is tucked, 90 is flared.
    const ws = body.jw(side, "shoulder");
    const we = body.jw(side, "elbow");
    const wh = body.jw(side, "hip");
    const flare = ws && we && wh ? angle3(wh, ws, we) : NaN;
    return { p: falling(elbow, 160, 90), elbow, line, kneeling, flare };
  },
  checks: [
    {
      id: "hips-sag",
      title: "Hips sagging",
      cue: "Lift your hips",
      tip: "Your hips dropped below the line from shoulders to heels. Squeeze your glutes and brace your abs like you're about to be poked in the stomach.",
      joints: [L.leftHip, L.rightHip],
      major: true,
      kind: "live",
      holdMs: 300,
      live: (m) => (Number.isFinite(m.line) ? m.line > 0.075 : null),
    },
    {
      id: "hips-high",
      title: "Hips too high",
      cue: "Lower your hips",
      tip: "Your hips piked up above the line from shoulders to heels, which shifts the work off your chest. Think of your body as one stiff plank.",
      joints: [L.leftHip, L.rightHip],
      major: true,
      kind: "live",
      holdMs: 300,
      live: (m) => (Number.isFinite(m.line) ? m.line < -0.1 : null),
    },
    {
      id: "elbows-flare",
      title: "Elbows flaring",
      cue: "Tuck your elbows",
      tip: "Your elbows pointed out to the sides at the bottom. Keep them about 45 degrees from your body to protect your shoulders.",
      joints: [L.leftElbow, L.rightElbow],
      major: false,
      kind: "rep",
      rep: (r) => (r.atPeak.flare ?? 0) > 45,
      beta: true,
    },
  ],
};

/** Bicep curl, front or side. Works with dumbbells, water bottles or nothing at all. */
export const curl: RepExercise = {
  id: "curl",
  name: "Bicep curl",
  kind: "reps",
  category: "upper",
  muscles: ["Biceps", "Forearms"],
  blurb: "Standing curls with anything you can hold. Cadence catches swinging and drifting elbows.",
  steps: [
    "Stand tall, arms by your sides, palms facing forward.",
    "Keep your elbows pinned to your ribs.",
    "Curl your hands up toward your shoulders.",
    "Lower slowly until your arms are straight.",
  ],
  easier: "Lighter weight, or one arm at a time.",
  harder: "Slow 3-second lowering, or a pause at the top.",
  met: 3.5,
  setup: {
    view: "any",
    posture: "standing",
    required: [eitherSide("shoulder", "elbow", "wrist", "hip")],
    placement: "Stand 2 to 3 metres from the camera so it sees you from head to hips at least.",
    startPose: (m) => m.p < 0.25 && m.pL < 0.25 && m.pR < 0.25,
    startHint: "Stand tall with your arms straight down",
  },
  alternating: true,
  enterAt: 0.3,
  exitAt: 0.15,
  countAt: 0.55,
  depthAt: 0.85,
  minRepMs: 1000,
  depthLabel: "curl height",
  shallowCue: "Curl higher",
  shallowTip: "Bring your hands all the way up to your shoulders, then lower all the way down.",
  measure(body: Body) {
    const joints = ["shoulder", "elbow", "wrist"] as const;
    // How high the wrist is above the elbow, measured against the upper arm,
    // which stays vertical in a good curl and so keeps its length from any angle.
    const lift = (s: Side) => {
      const upper = segment(body, s, "shoulder", "elbow") || 1;
      return (body.j(s, "elbow").y - body.j(s, "wrist").y) / upper;
    };
    const both = bySide(body, [...joints], (s) => rising(lift(s), -0.75, 0.45));
    if (!both) return null;
    const near = body.nearSide(["shoulder", "elbow", "hip"]);
    const sideView = body.view() === "side";
    // Upper arm swinging forward: from the side it's in the picture; from the front only depth shows it.
    const drift = (s: Side) => {
      if (sideView || !body.world) return fromDown(body.j(s, "shoulder"), body.j(s, "elbow"));
      const sh = body.jw(s, "shoulder")!;
      const el = body.jw(s, "elbow")!;
      const hp = body.jw(s, "hip")!;
      return angle3(hp, sh, el);
    };
    const driftV = bySide(body, ["shoulder", "elbow", "hip"], drift);
    const lean = sideVisible(body, near, ["shoulder", "hip"]) ? torsoLean(body, near) : NaN;
    const pL = Number.isFinite(both.left) ? both.left : -0.5;
    const pR = Number.isFinite(both.right) ? both.right : -0.5;
    return { p: Math.max(pL, pR), pL, pR, drift: driftV?.mean ?? NaN, lean };
  },
  checks: [
    {
      id: "elbow-drift",
      title: "Elbows drifting forward",
      cue: "Pin your elbows",
      tip: "Your upper arms swung forward, which lets your shoulders do the lifting. Keep your elbows glued to your sides.",
      joints: [L.leftElbow, L.rightElbow, L.leftShoulder, L.rightShoulder],
      major: false,
      kind: "live",
      holdMs: 250,
      live: (m) => (Number.isFinite(m.drift) ? m.drift > 40 : null),
    },
    {
      id: "swing",
      title: "Swinging",
      cue: "No swinging",
      tip: "Your body rocked to throw the weight up. Stand tall and let your arms do the work, or use a lighter weight.",
      joints: [L.leftHip, L.rightHip, L.leftShoulder, L.rightShoulder],
      major: true,
      kind: "rep",
      rep: (r) => Number.isFinite(r.max.lean) && r.max.lean - r.min.lean > 14,
    },
  ],
};

/** Overhead press, facing the camera. Bodyweight, bottles or dumbbells. */
export const press: RepExercise = {
  id: "press",
  name: "Shoulder press",
  kind: "reps",
  category: "upper",
  muscles: ["Shoulders", "Triceps", "Upper back"],
  blurb: "Press overhead to full lockout. Cadence watches for uneven arms and half reps.",
  steps: [
    "Stand facing the camera, hands at shoulder height, elbows under your wrists.",
    "Brace your core and squeeze your glutes.",
    "Press straight up until your arms are fully straight overhead.",
    "Lower back to shoulder height with control.",
  ],
  easier: "Seated, or one arm at a time.",
  harder: "Heavier weight, or a slow 3-second lowering.",
  met: 3.5,
  setup: {
    view: "front",
    posture: "standing",
    required: [bothSides("shoulder", "elbow", "wrist")],
    placement: "Face the camera from 2 to 3 metres away, with room above your head for your hands.",
    startPose: (m) => m.p < 0.2 && m.p > -0.8,
    startHint: "Hands at shoulder height, elbows bent",
  },
  enterAt: 0.3,
  exitAt: 0.15,
  countAt: 0.55,
  depthAt: 0.85,
  minRepMs: 900,
  depthLabel: "lockout",
  shallowCue: "All the way up",
  shallowTip: "Press until your arms are completely straight overhead.",
  measure(body: Body) {
    if (!body.visible(L.leftShoulder, L.rightShoulder, L.leftElbow, L.rightElbow, L.leftWrist, L.rightWrist)) return null;
    const reach = (s: Side) => {
      const arm = segment(body, s, "shoulder", "elbow") + segment(body, s, "elbow", "wrist") || 1;
      return (body.j(s, "shoulder").y - body.j(s, "wrist").y) / arm;
    };
    const rl = reach("left");
    const rr = reach("right");
    const elbow = (angle(body.p(L.leftShoulder), body.p(L.leftElbow), body.p(L.leftWrist)) + angle(body.p(L.rightShoulder), body.p(L.rightElbow), body.p(L.rightWrist))) / 2;
    return { p: rising((rl + rr) / 2, 0.5, 0.93), elbow, uneven: Math.abs(rl - rr) };
  },
  checks: [
    {
      id: "uneven",
      title: "Uneven arms",
      cue: "Press evenly",
      tip: "One hand rose faster than the other. Lead with both hands together so one shoulder doesn't do all the work.",
      joints: [L.leftWrist, L.rightWrist],
      major: false,
      kind: "rep",
      rep: (r) => (r.atPeak.uneven ?? 0) > 0.15,
    },
  ],
};

/** Lateral raise, facing the camera. */
export const lateralRaise: RepExercise = {
  id: "lateral-raise",
  name: "Lateral raise",
  kind: "reps",
  category: "upper",
  muscles: ["Side shoulders", "Upper back"],
  blurb: "Raise your arms out to shoulder height. Cadence stops you going too high.",
  steps: [
    "Stand facing the camera, arms by your sides.",
    "Keep a soft bend in your elbows.",
    "Raise your arms out to the sides until they're level with your shoulders.",
    "Lower slowly.",
  ],
  easier: "No weight, or bend your elbows to 90 degrees.",
  harder: "Hold for 2 seconds at the top of every rep.",
  met: 3.5,
  setup: {
    view: "front",
    posture: "standing",
    required: [bothSides("shoulder", "elbow", "wrist")],
    placement: "Face the camera from 2 to 3 metres away, with room on both sides for your arms.",
    startPose: (m) => m.p < 0.2,
    startHint: "Stand tall with your arms by your sides",
  },
  enterAt: 0.3,
  exitAt: 0.15,
  countAt: 0.55,
  depthAt: 0.85,
  minRepMs: 1000,
  depthLabel: "arm height",
  shallowCue: "Up to shoulder height",
  shallowTip: "Raise your arms until they're level with your shoulders.",
  measure(body: Body) {
    const both = bySide(body, ["shoulder", "elbow", "wrist"], (s) => armRaise(body, s));
    if (!both || !Number.isFinite(both.left) || !Number.isFinite(both.right)) return null;
    const elbow = (angle(body.p(L.leftShoulder), body.p(L.leftElbow), body.p(L.leftWrist)) + angle(body.p(L.rightShoulder), body.p(L.rightElbow), body.p(L.rightWrist))) / 2;
    const shoulderW = dist(body.p(L.leftShoulder), body.p(L.rightShoulder)) || 1;
    return { p: rising(both.mean, 20, 82), raise: both.mean, elbow, uneven: Math.abs(both.left - both.right), shoulderW };
  },
  checks: [
    {
      id: "too-high",
      title: "Arms too high",
      cue: "Stop at shoulder height",
      tip: "Going above shoulder height shifts the load to your traps and can pinch the shoulder. Stop when your arms are level.",
      joints: [L.leftWrist, L.rightWrist, L.leftShoulder, L.rightShoulder],
      major: false,
      kind: "rep",
      rep: (r) => r.max.raise > 118,
    },
    {
      id: "uneven",
      title: "Uneven arms",
      cue: "Raise both arms evenly",
      tip: "One arm rose higher than the other. Move both arms together.",
      joints: [L.leftWrist, L.rightWrist],
      major: false,
      kind: "rep",
      rep: (r) => (r.atPeak.uneven ?? 0) > 25,
    },
  ],
};
