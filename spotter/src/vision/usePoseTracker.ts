import { useEffect, useRef, useState } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseFrame } from "../engine/types";
import { createPoseLandmarker, type Delegate, type ModelVariant } from "./poseLandmarker";
import { PersonPicker } from "./personPicker";

/**
 * Runs pose estimation on every new frame of a playing <video>.
 *
 * Frames are delivered through a callback, not React state: this is a 30 Hz
 * hot path and the consumer decides how often to re-render.
 */

type Loaded = { landmarker: PoseLandmarker; delegate: Delegate };
const cache = new Map<ModelVariant, Promise<Loaded>>();

/** One landmarker per model variant for the whole app, so changing pages doesn't reload the model. */
export function getLandmarker(variant: ModelVariant): Promise<Loaded> {
  let p = cache.get(variant);
  if (!p) {
    p = createPoseLandmarker(variant);
    p.catch(() => cache.delete(variant));
    cache.set(variant, p);
  }
  return p;
}

export type TrackerStatus = "idle" | "loading" | "ready" | "error";

export interface TrackerInfo {
  status: TrackerStatus;
  delegate: Delegate | null;
  error: string | null;
  /** Average model time per frame over the last second, in ms. */
  inferenceMs: number;
  /** Frames processed in the last second. */
  fps: number;
}

type VideoWithRvfc = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export function usePoseTracker(options: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  variant: ModelVariant;
  onFrame: (frame: PoseFrame) => void;
}): TrackerInfo {
  const { videoRef, enabled, variant, onFrame } = options;
  const [info, setInfo] = useState<TrackerInfo>({ status: "idle", delegate: null, error: null, inferenceMs: 0, fps: 0 });
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let handle: number | null = null;
    let usingRvfc = false;
    const picker = new PersonPicker();
    let landmarker: PoseLandmarker | null = null;
    let lastVideoTime = -1;
    let lastTs = 0;
    let windowStart = performance.now();
    let frames = 0;
    let inferenceTotal = 0;

    setInfo((i) => ({ ...i, status: "loading", error: null }));

    const schedule = () => {
      const video = videoRef.current as VideoWithRvfc | null;
      if (!video || cancelled) return;
      if (video.requestVideoFrameCallback) {
        usingRvfc = true;
        handle = video.requestVideoFrameCallback(tick);
      } else {
        usingRvfc = false;
        handle = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && landmarker && video.readyState >= 2 && video.videoWidth > 0 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        // MediaPipe requires strictly increasing timestamps.
        const ts = Math.max(performance.now(), lastTs + 1);
        lastTs = ts;
        const before = performance.now();
        try {
          const result = landmarker.detectForVideo(video, ts);
          inferenceTotal += performance.now() - before;
          frames += 1;
          const people = result.landmarks.map((lm, i) => ({ landmarks: lm, world: result.worldLandmarks[i] }));
          onFrameRef.current(picker.pick(people, video.videoWidth, video.videoHeight, ts));
        } catch (err) {
          setInfo((i) => ({ ...i, status: "error", error: err instanceof Error ? err.message : String(err) }));
          return;
        }
        const now = performance.now();
        if (now - windowStart >= 1000) {
          const elapsed = now - windowStart;
          const fps = Math.round((frames * 1000) / elapsed);
          const inferenceMs = frames ? inferenceTotal / frames : 0;
          setInfo((i) => ({ ...i, fps, inferenceMs }));
          frames = 0;
          inferenceTotal = 0;
          windowStart = now;
        }
      }
      schedule();
    };

    getLandmarker(variant)
      .then((loaded) => {
        if (cancelled) return;
        landmarker = loaded.landmarker;
        setInfo((i) => ({ ...i, status: "ready", delegate: loaded.delegate }));
        schedule();
      })
      .catch((err) => {
        if (cancelled) return;
        setInfo((i) => ({ ...i, status: "error", error: err instanceof Error ? err.message : String(err) }));
      });

    return () => {
      cancelled = true;
      const video = videoRef.current as VideoWithRvfc | null;
      if (handle !== null) {
        if (usingRvfc && video?.cancelVideoFrameCallback) video.cancelVideoFrameCallback(handle);
        else cancelAnimationFrame(handle);
      }
    };
  }, [enabled, variant, videoRef]);

  return info;
}
