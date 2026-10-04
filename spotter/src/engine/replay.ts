import { exercise } from "./exercises";
import { ExerciseSession, type SetSummary } from "./session";
import type { PoseFrame } from "./types";

/**
 * Scores recorded pose frames the way a live set would: the set starts once
 * the camera has had a proper view of the person (framing and posture right)
 * for a moment (0.3 s), like the hands-free start, and is then counted
 * frame by frame. Used by "Analyze a video" and by the real-footage tests.
 */
export function scoreFrames(exerciseId: string, frames: PoseFrame[]): SetSummary {
  const s = new ExerciseSession(exercise(exerciseId));
  let okSince: number | null = null;
  for (const f of frames) {
    const st = s.push(f);
    if (!s.started) {
      okSince = st.framing.ok ? (okSince ?? f.t) : null;
      if (okSince !== null && f.t - okSince >= 300) s.begin(f.t);
    }
  }
  return s.summary();
}
