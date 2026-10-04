import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { POSE_MODEL_PATHS, WASM_BASE_PATH } from "./assetPaths.generated";

/**
 * MediaPipe Pose Landmarker, loaded from our own origin.
 *
 * No frame ever leaves the device: the WASM runtime runs inference in this tab
 * and hands back 33 points per person. That is what lets anyone use it at a
 * booth or at home without worrying about video being uploaded, and what makes
 * it free to run for any number of users.
 */

/**
 * MediaPipe's task runtime sends Google anonymous performance statistics
 * (which task ran, how often, how fast) to odml.pa.googleapis.com every
 * minute. No images or body points are in it, but Spotter promises that
 * nothing leaves the device, so that one request is answered locally instead.
 * Checked with a network capture of a live set (e2e/privacy.spec.ts).
 */
const TELEMETRY = "https://odml.pa.googleapis.com/";
if (typeof window !== "undefined" && !(window.fetch as { spotterGuard?: boolean }).spotterGuard) {
  const realFetch = window.fetch.bind(window);
  const guarded = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(TELEMETRY)) return Promise.resolve(new Response(null, { status: 204 }));
    return realFetch(input, init);
  };
  (guarded as { spotterGuard?: boolean }).spotterGuard = true;
  window.fetch = guarded as typeof window.fetch;
}

export type ModelVariant = keyof typeof POSE_MODEL_PATHS;
export type Delegate = "GPU" | "CPU";

/** Resolve a path in public/ against wherever the app is being served from. */
export function assetUrl(path: string): string {
  return new URL(path, new URL(import.meta.env.BASE_URL, window.location.href)).href;
}

export async function createPoseLandmarker(
  variant: ModelVariant,
  preferred: Delegate = "GPU",
): Promise<{ landmarker: PoseLandmarker; delegate: Delegate }> {
  const fileset = await FilesetResolver.forVisionTasks(assetUrl(WASM_BASE_PATH));
  const build = (delegate: Delegate) =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: assetUrl(POSE_MODEL_PATHS[variant]), delegate },
      runningMode: "VIDEO",
      // More than one, so a visitor walking behind the person exercising at a
      // booth doesn't steal the tracking (see personPicker.ts).
      numPoses: 3,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  try {
    return { landmarker: await build(preferred), delegate: preferred };
  } catch (err) {
    if (preferred === "CPU") throw err;
    // WebGL is missing or blocklisted on some older laptops.
    return { landmarker: await build("CPU"), delegate: "CPU" };
  }
}
