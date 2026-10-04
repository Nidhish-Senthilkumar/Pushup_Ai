import type { PoseFrame } from "../engine/types";
import { createPoseLandmarker, type ModelVariant } from "./poseLandmarker";
import { PersonPicker } from "./personPicker";

/**
 * Runs the pose model over a recorded video, frame by frame, entirely in the
 * browser. Seeking frame by frame is slower than playing the video but never
 * drops a frame, so the result is the same on a fast laptop and a slow phone.
 */
export async function analyzeVideo(
  src: File | string,
  opts: { variant?: ModelVariant; fps?: number; onProgress?: (done: number) => void; signal?: AbortSignal } = {},
): Promise<{ frames: PoseFrame[]; width: number; height: number; duration: number }> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  video.src = url;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("This video couldn't be opened. Try an MP4 or WebM file."));
  });
  const { landmarker } = await createPoseLandmarker(opts.variant ?? "full");
  const picker = new PersonPicker();
  const fps = opts.fps ?? 30;
  const duration = video.duration;
  const frames: PoseFrame[] = [];
  const seek = (t: number) =>
    new Promise<void>((resolve) => {
      const done = () => {
        video.removeEventListener("seeked", done);
        resolve();
      };
      video.addEventListener("seeked", done);
      video.currentTime = t;
    });
  try {
    const step = 1 / fps;
    for (let t = 0, i = 0; t < duration; t += step, i++) {
      if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      await seek(t);
      const ts = Math.round(t * 1000) + 1;
      const result = landmarker.detectForVideo(video, ts);
      const people = result.landmarks.map((lm, k) => ({ landmarks: lm, world: result.worldLandmarks[k] }));
      frames.push(picker.pick(people, video.videoWidth, video.videoHeight, ts));
      if (i % 5 === 0) opts.onProgress?.(Math.min(1, t / duration));
    }
  } finally {
    landmarker.close();
    if (typeof src !== "string") URL.revokeObjectURL(url);
  }
  opts.onProgress?.(1);
  return { frames, width: video.videoWidth, height: video.videoHeight, duration };
}
