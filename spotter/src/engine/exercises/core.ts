import type { Body } from "../body";
import type { HoldExercise, RepExercise } from "../exercise";
import { elevation } from "../geometry";
import { LM } from "../types";
import { bothSides, bySide, eitherSide, hipLine, jointAngle, rising, segment, sideVisible } from "./helpers";

const L = LM;

/** Plank, a hold filmed from the side. High plank or forearm plank both count. */
export const plank: HoldExercise = {
  id: "plank",
  name: "Plank",
  kind: "hold",
  category: "core",
  muscles: ["Abs", "Shoulders", "Glutes"],
  blurb: "One straight line, held. The timer only counts seconds in good form.",
  steps: [
    "Forearms or hands on the floor, elbows under your shoulders.",
    "Step your feet back into a straight line from head to heels.",
    "Squeeze your glutes and brace your abs.",
    "Hold without letting your hips sag or lift.",
  ],
  easier: "Knees on the floor, keeping the line from head to knees.",
  harder: "Lift one foot, or reach one arm forward.",
  met: 3.8,
  setup: {
    view: "side",
    posture: "lying",
    required: [eitherSide("shoulder", "hip"), [[L.leftAnkle], [L.rightAnkle], [L.leftKnee], [L.rightKnee]]],
    placement: "Put the camera on the floor about 2 metres to your side, so it sees you from head to feet.",
    startPose: (m) => m.flat < 35,
    startHint: "Get into a plank",
  },
  inPosition: (m) => m.flat < 35 && Math.abs(m.line) < 0.25 && m.supported > 0,
  measure(body: Body) {
    const side = body.nearSide(["shoulder", "hip", "ankle"]);
    if (!sideVisible(body, side, ["shoulder", "hip"])) return null;
    if (body.torsoTilt() < 45) return null;
    const ankleOk = body.vis(side === "left" ? L.leftAnkle : L.rightAnkle) >= 0.5;
    const kneeOk = body.vis(side === "left" ? L.leftKnee : L.rightKnee) >= 0.5;
    if (!ankleOk && !kneeOk) return null;
    const end = ankleOk ? "ankle" : "knee";
    const line = hipLine(body, side, end);
    const flat = Math.abs(elevation(body.j(side, end), body.j(side, "shoulder")));
    // Holding yourself up on hands or forearms: the elbow or wrist sits below the shoulder.
    const sh = body.j(side, "shoulder");
    const supported = body.j(side, "elbow").y > sh.y || body.j(side, "wrist").y > sh.y ? 1 : 0;
    return { p: 0, line, flat, supported };
  },
  checks: [
    {
      id: "hips-sag",
      title: "Hips sagging",
      cue: "Lift your hips",
      tip: "Your hips dropped toward the floor, which loads your lower back. Squeeze your glutes and pull your belly button in.",
      joints: [L.leftHip, L.rightHip],
      major: true,
      kind: "live",
      holdMs: 500,
      live: (m) => m.line > 0.07,
    },
    {
      id: "hips-high",
      title: "Hips too high",
      cue: "Lower your hips",
      tip: "Your hips piked up, which takes the work away from your core. Lower them until your body is one straight line.",
      joints: [L.leftHip, L.rightHip],
      major: true,
      kind: "live",
      holdMs: 500,
      live: (m) => m.line < -0.1,
    },
  ],
};

/** Sit-up, filmed from the side. */
export const situp: RepExercise = {
  id: "situp",
  name: "Sit-up",
  kind: "reps",
  category: "core",
  muscles: ["Abs", "Hip flexors"],
  blurb: "Curl all the way up and back down with control.",
  steps: [
    "Lie on your back, knees bent, feet flat.",
    "Cross your arms over your chest.",
    "Curl up until your chest is close to your knees.",
    "Lower back down slowly until your shoulders touch the floor.",
  ],
  easier: "Crunches: lift only your shoulders off the floor.",
  harder: "Hold a weight on your chest, or slow down the lowering.",
  met: 8,
  setup: {
    view: "side",
    posture: "lying",
    required: [eitherSide("shoulder", "hip", "knee")],
    placement: "Put the camera on the floor about 2 metres to your side.",
    startPose: (m) => m.p < 0.2,
    startHint: "Lie on your back with your knees bent",
  },
  enterAt: 0.28,
  exitAt: 0.12,
  countAt: 0.5,
  depthAt: 0.85,
  minRepMs: 1000,
  depthLabel: "how far up",
  shallowCue: "All the way up",
  shallowTip: "Curl up until your chest comes close to your knees, then lower all the way down.",
  measure(body: Body) {
    const side = body.nearSide(["shoulder", "hip", "knee"]);
    if (!sideVisible(body, side, ["shoulder", "hip", "knee"])) return null;
    const torso = elevation(body.j(side, "hip"), body.j(side, "shoulder"));
    return { p: rising(torso, 18, 65), torso };
  },
  checks: [],
};

/** Jumping jack, facing the camera. Arms and legs both have to travel for a rep to count. */
export const jumpingJack: RepExercise = {
  id: "jumping-jack",
  name: "Jumping jack",
  kind: "reps",
  category: "cardio",
  muscles: ["Full body", "Heart"],
  blurb: "Cardio with a form check: hands all the way up, feet all the way out.",
  steps: [
    "Stand tall, feet together, arms by your sides.",
    "Jump your feet out wide while swinging your arms overhead.",
    "Jump back to the start.",
    "Keep a steady rhythm.",
  ],
  easier: "Step one foot out at a time instead of jumping.",
  harder: "Go faster, or add a squat when your feet land wide.",
  met: 8,
  setup: {
    view: "front",
    posture: "standing",
    required: [bothSides("shoulder", "wrist", "hip", "ankle")],
    placement: "Face the camera from 3 metres away, with room above your head and to both sides.",
    startPose: (m) => m.p < 0.2,
    startHint: "Stand tall, feet together, arms down",
  },
  enterAt: 0.3,
  exitAt: 0.18,
  countAt: 0.5,
  depthAt: 0.82,
  minRepMs: 400,
  depthLabel: "range",
  shallowCue: "Bigger jacks",
  shallowTip: "Get your hands all the way overhead and your feet wider than your shoulders.",
  measure(body: Body) {
    if (!body.visible(L.leftShoulder, L.rightShoulder, L.leftWrist, L.rightWrist, L.leftHip, L.rightHip, L.leftAnkle, L.rightAnkle)) return null;
    const arms = bySide(body, ["shoulder", "wrist"], (s) => {
      const sh = body.j(s, "shoulder");
      const wr = body.j(s, "wrist");
      return Math.atan2(sh.y - wr.y, Math.abs(wr.x - sh.x)) * (180 / Math.PI) + 90;
    });
    if (!arms || !Number.isFinite(arms.left) || !Number.isFinite(arms.right)) return null;
    // Both arms have to go up: the lower arm sets the pace, so waving one arm isn't a jack.
    const lowArm = Math.min(arms.left, arms.right);
    const hipW = Math.abs(body.p(L.leftHip).x - body.p(L.rightHip).x) || 1;
    const shin = (segment(body, "left", "knee", "ankle") + segment(body, "right", "knee", "ankle")) / 2 || 1;
    const feet = Math.abs(body.p(L.leftAnkle).x - body.p(L.rightAnkle).x);
    // Feet gap measured against the shin, which keeps its length while jumping.
    const spread = feet / shin;
    const armP = rising(lowArm, 40, 150);
    const legP = rising(spread, 0.65, 1.2);
    return { p: 0.6 * armP + 0.4 * legP, arms: lowArm, spread, armP, legP, hipW };
  },
  checks: [
    {
      id: "arms-low",
      title: "Arms not overhead",
      cue: "Hands all the way up",
      tip: "Your hands stopped short of overhead. Reach up until your arms are close to your ears.",
      joints: [L.leftWrist, L.rightWrist],
      major: false,
      kind: "rep",
      rep: (r) => r.max.arms < 140,
    },
    {
      id: "feet-narrow",
      title: "Feet not wide",
      cue: "Jump wider",
      tip: "Your feet didn't travel far. Land with your feet wider than your shoulders.",
      joints: [L.leftAnkle, L.rightAnkle],
      major: false,
      kind: "rep",
      rep: (r) => r.max.spread < 0.95,
    },
  ],
};

/** High knees, facing the camera. Each knee lift is one rep. */
export const highKnees: RepExercise = {
  id: "high-knees",
  name: "High knees",
  kind: "reps",
  category: "cardio",
  muscles: ["Hip flexors", "Quads", "Heart"],
  blurb: "Run on the spot and drive each knee up to hip height.",
  steps: [
    "Stand tall facing the camera.",
    "Run on the spot, driving one knee up to hip height.",
    "Switch legs quickly and pump your arms.",
    "Stay on the balls of your feet.",
  ],
  easier: "March instead of running.",
  harder: "Go faster, or hold your hands out at hip height and touch them with your knees.",
  met: 8,
  setup: {
    view: "front",
    posture: "standing",
    required: [bothSides("hip", "knee", "ankle")],
    placement: "Face the camera from 3 metres away so it sees you from head to feet.",
    startPose: (m) => m.pL < 0.25 && m.pR < 0.25,
    startHint: "Stand tall facing the camera",
  },
  alternating: true,
  enterAt: 0.3,
  exitAt: 0.15,
  countAt: 0.5,
  depthAt: 0.8,
  minRepMs: 250,
  depthLabel: "knee height",
  shallowCue: "Knees higher",
  shallowTip: "Drive each knee up until your thigh is level with the floor.",
  measure(body: Body) {
    const lift = bySide(body, ["hip", "knee", "ankle"], (s) => {
      const shin = segment(body, s, "knee", "ankle") || 1;
      return (body.j(s, "hip").y - body.j(s, "knee").y) / shin;
    });
    if (!lift || !Number.isFinite(lift.left) || !Number.isFinite(lift.right)) return null;
    const pL = rising(lift.left, -1.0, -0.15);
    const pR = rising(lift.right, -1.0, -0.15);
    return { p: Math.max(pL, pR), pL, pR };
  },
  checks: [],
};

/**
 * Burpee: stand, hands down, kick back to a plank, back in, stand up. Filmed
 * from the side. A rep is standing → full plank → standing. Torso angle alone
 * can't tell the folded-over squat from the plank (the torso is level in
 * both), so progress needs a level torso *and* a straight body at the hip.
 */
export const burpee: RepExercise = {
  id: "burpee",
  name: "Burpee",
  kind: "reps",
  category: "cardio",
  muscles: ["Full body", "Heart", "Chest", "Legs"],
  blurb: "The full-body classic. Cadence checks you reach a full plank and stand all the way up.",
  steps: [
    "Stand tall, feet shoulder-width apart.",
    "Squat down and put your hands on the floor.",
    "Jump or step your feet back into a straight plank.",
    "Jump or step your feet back in, then stand up tall (add a jump if you like).",
  ],
  easier: "Step back and in one foot at a time instead of jumping.",
  harder: "Add a push-up at the bottom and a jump at the top.",
  met: 8,
  floor: true,
  setup: {
    view: "side",
    posture: "standing",
    required: [eitherSide("shoulder", "hip", "knee", "ankle")],
    placement: "Put the camera at knee height about 3 metres to your side, with room for your body to stretch out.",
    startPose: (m) => m.p < -0.15,
    startHint: "Stand tall",
  },
  enterAt: 0.3,
  exitAt: -0.15,
  countAt: 0.6,
  depthAt: 0.85,
  minRepMs: 0,
  depthLabel: "plank",
  shallowCue: "Kick back to a full plank",
  shallowTip: "Get your feet all the way back so your body makes a straight line, like the top of a push-up.",
  measure(body: Body) {
    const side = body.nearSide(["shoulder", "hip", "knee", "ankle"]);
    if (!sideVisible(body, side, ["shoulder", "hip", "ankle"])) return null;
    const tilt = body.torsoTilt();
    const sideView = body.view() !== "front";
    const hip = jointAngle(body, side, "shoulder", "hip", "ankle", sideView);
    const level = Math.max(0, Math.min(1, rising(tilt, 30, 65)));
    const straight = Math.max(0, Math.min(1, rising(hip, 110, 155)));
    const upright = 1 - Math.max(0, Math.min(1, rising(tilt, 20, 45)));
    return { p: level * straight - 0.3 * upright, torso: tilt, hip };
  },
  checks: [],
};
