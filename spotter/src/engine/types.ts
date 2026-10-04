/**
 * Shared types for the exercise engine.
 *
 * Image coordinates are pixels with y pointing down, the way the camera sees
 * them. World coordinates are MediaPipe's metric 3D estimate centred on the
 * hips (x to the person's left as seen by the camera, y down, z toward the
 * camera). Times are milliseconds. Nothing in src/engine touches the DOM, so
 * the whole engine runs under plain Node in the unit tests.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Point3 extends Point {
  z: number;
}

/** One body landmark in image pixels, with the model's own visibility score (0 to 1). */
export interface Landmark extends Point {
  visibility: number;
}

/** MediaPipe Pose landmark indices. */
export const LM = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

export type Side = "left" | "right";

/** Skeleton connections drawn on the overlay and in the exercise demos. */
export const BONES: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [29, 31],
  [27, 31],
  [28, 30],
  [30, 32],
  [28, 32],
];

/** One camera frame after pose estimation. `landmarks` holds all 33 points, or is empty when nobody was found. */
export interface PoseFrame {
  t: number;
  width: number;
  height: number;
  landmarks: Landmark[];
  /** Metric 3D estimate for the same 33 points, when the model provides it. */
  world?: Point3[];
  /** How many people the pose model found; `landmarks` is the one being followed. */
  people?: number;
  /**
   * Everyone in view, when there's more than one person. The session picks
   * who to coach from these by who is doing the exercise (selector.ts).
   */
  candidates?: { landmarks: Landmark[]; world?: Point3[] }[];
}
