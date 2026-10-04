import { Body, VISIBLE } from "./body";
import type { Exercise } from "./exercise";
import { LM } from "./types";

/**
 * Before counting anything, check that the camera can actually see what the
 * exercise needs, and say exactly what to change when it can't. Most bad
 * counts in a demo come from a camera that's too close, too far or facing the
 * wrong way, not from the model.
 */

export type FramingIssue =
  | "no-person"
  | "too-far"
  | "too-close"
  | "feet-cut"
  | "head-cut"
  | "arms-cut"
  | "turn-side"
  | "face-camera"
  | "get-down"
  | "stand-up";

export interface Framing {
  ok: boolean;
  issues: FramingIssue[];
}

export const ISSUE_TEXT: Record<FramingIssue, string> = {
  "no-person": "Step into view of the camera",
  "too-far": "Come closer to the camera",
  "too-close": "Step back so your whole body fits",
  "feet-cut": "Your feet are out of frame. Step back or tilt the camera down",
  "head-cut": "Your head is out of frame. Step back or tilt the camera up",
  "arms-cut": "Your arms are out of frame. Step back a little",
  "turn-side": "Turn sideways to the camera",
  "face-camera": "Face the camera",
  "get-down": "Get down into the start position",
  "stand-up": "Stand up to start",
};

const LOWER = [LM.leftKnee, LM.rightKnee, LM.leftAnkle, LM.rightAnkle];
const UPPER = [LM.nose, LM.leftShoulder, LM.rightShoulder];
const ARMS = [LM.leftElbow, LM.rightElbow, LM.leftWrist, LM.rightWrist];

function groupOk(body: Body, group: number[][]): boolean {
  return group.some((alt) => alt.every((i) => body.vis(i) >= VISIBLE));
}

function nearEdge(body: Body, idx: number[]): boolean {
  const mx = body.width * 0.01;
  const my = body.height * 0.01;
  return idx.some((i) => {
    const p = body.p(i);
    return p.x < mx || p.x > body.width - mx || p.y < my || p.y > body.height - my;
  });
}

export function checkFraming(body: Body, ex: Exercise): Framing {
  if (!body.present) return { ok: false, issues: ["no-person"] };
  const issues: FramingIssue[] = [];
  const missing = ex.setup.required.filter((g) => !groupOk(body, g));
  if (missing.length) {
    const flat = new Set(missing.flat(2));
    const lowerMissing = LOWER.some((i) => flat.has(i));
    const upperMissing = UPPER.some((i) => flat.has(i));
    const armsMissing = ARMS.some((i) => flat.has(i));
    const box = body.bounds(0.3);
    const boxH = box ? (box.y1 - box.y0) / body.height : 0;
    // Feet below the bottom edge, or head above the top edge, are the usual
    // reasons. A tiny skeleton means the person is too far for the model.
    if (lowerMissing && (nearEdge(body, LOWER) || (box && box.y1 > body.height * 0.95))) issues.push("feet-cut");
    else if (upperMissing && (nearEdge(body, UPPER) || (box && box.y0 < body.height * 0.03))) issues.push("head-cut");
    else if (armsMissing && nearEdge(body, ARMS)) issues.push("arms-cut");
    else if (box && boxH > 0.98) issues.push("too-close");
    else if (lowerMissing) issues.push("feet-cut");
    else if (armsMissing) issues.push("arms-cut");
    else issues.push("too-close");
  }
  // Too far: judged on the length of the body (shoulder to hip to knee to
  // ankle), which doesn't shrink when someone squats or curls up, unlike the
  // box around them.
  // Shoulder width stands in when the body points at the camera (a push-up
  // filmed head-on), where the shoulder-to-ankle chain looks short.
  if (!issues.length) {
    const shoulders = body.visible(LM.leftShoulder, LM.rightShoulder) ? Math.hypot(body.p(LM.leftShoulder).x - body.p(LM.rightShoulder).x, body.p(LM.leftShoulder).y - body.p(LM.rightShoulder).y) : 0;
    const size = Math.max(body.chainPx("left"), body.chainPx("right"), 3.5 * shoulders);
    // 0.14: a person whose body length is 16% of the frame still counted
    // correctly (VALIDATION.md, stress tests); below that is untested.
    if (size > 0 && size < 0.14 * Math.max(body.width, body.height)) issues.push("too-far");
  }
  const view = body.view();
  const lying = body.lying();
  if (!issues.length) {
    if (ex.setup.view === "side" && view === "front") issues.push("turn-side");
    if (ex.setup.view === "front" && view === "side") issues.push("face-camera");
  }
  // Posture only matters once the person is properly in view; otherwise the
  // framing issue is the more useful thing to say.
  if (!issues.length) {
    if (ex.setup.posture === "lying" && !lying) issues.push("get-down");
    if (ex.setup.posture === "standing" && lying) issues.push("stand-up");
  }
  return { ok: issues.length === 0, issues };
}
