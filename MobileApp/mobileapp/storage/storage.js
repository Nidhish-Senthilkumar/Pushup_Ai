import * as FileSystem from "expo-file-system/legacy";

// path of file
const fileUri = FileSystem.documentDirectory + "pushup_history.json";

// ─── Rule-based form scoring (no ML model needed) ─────────────────────────
// Each rep is scored 0–100 directly from the joint angles /analyze returns.
const clampScore = (v) => Math.max(0, Math.min(100, Math.round(v)));

// Depth: elbow should bend to ~90° (or lower) at the bottom.   90°→100, 140°→0
const depthScore = (lowestElbow) => clampScore(100 - (lowestElbow - 90) * 2);
// Lockout: elbow should straighten to ~170°+ at the top.      170°→100, 120°→0
const lockoutScore = (highestElbow) =>
  clampScore(100 - (170 - highestElbow) * 2);
// Alignment: body stays a straight plank (hip angle ~180°).   180°→100, 130°→0
const alignScore = (avgHip) =>
  avgHip > 0 ? clampScore(100 - (180 - avgHip) * 2) : 100;

// Weighted overall score for a single rep (depth matters most).
const scoreRep = (lowestElbow, highestElbow, avgHip) => {
  const depth = depthScore(lowestElbow);
  const lockout = lockoutScore(highestElbow);
  const align = alignScore(avgHip);
  return {
    depth,
    lockout,
    align,
    total: clampScore(depth * 0.5 + lockout * 0.25 + align * 0.25),
  };
};

// Session label from the average score.
const sessionLabel = (score) => {
  if (score >= 90) return "✅ Great Form";
  if (score >= 75) return "Good Form";
  if (score >= 60) return "Needs Work";
  return "Keep Practicing";
};

// Returns the next sequential session number (1, 2, 3 …) for a history list.
const nextSessionNumber = (history) => {
  const list = Array.isArray(history) ? history : [];
  const max = list.reduce(
    (m, s) => Math.max(m, (s && Number(s.sessionNumber)) || 0),
    0,
  );
  return max + 1;
};

/**
 * Saves a new push-up session to the file.
 * @param {Object|null} newSession - the session to add, or null to just persist `existingHistory`
 * @param {Array} existingHistory - The current history array from your app state
 */
export const saveWorkoutToFile = async (newSession, existingHistory) => {
  try {
    const existing = Array.isArray(existingHistory) ? existingHistory : [];

    let updatedHistory;
    if (newSession) {
      // Assign a sequential session number if one wasn't set by the caller.
      const session =
        newSession.sessionNumber == null
          ? { ...newSession, sessionNumber: nextSessionNumber(existing) }
          : newSession;
      // Put the newest workout at the top of the list
      updatedHistory = [session, ...existing];
    } else {
      // No new session (e.g. a delete/overwrite) — just persist the list as-is.
      updatedHistory = [...existing];
    }

    // Turn the array into text and save it
    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(updatedHistory),
    );

    return updatedHistory; // Returns the new list so your UI can update
  } catch (error) {
    console.error("Error writing to file:", error);
    throw error;
  }
};

/**
 * Convenience: append a session without the caller needing to hold history
 * state. Loads the current file, prepends, and saves (with sequential id).
 */
export const saveSession = async (newSession) => {
  const history = await loadHistoryFromFile();
  return await saveWorkoutToFile(newSession, history);
};

export const loadHistoryFromFile = async () => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);

    if (fileInfo.exists) {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const parsed = JSON.parse(fileContent); // Convert text back into a JS array
      // Drop any null/blank rows that older builds may have written.
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    }

    return []; // Return empty array if file doesn't exist yet
  } catch (error) {
    console.error("Error reading from file:", error);
    return [];
  }
};

export const clearHistoryFile = async () => {
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    return [];
  } catch (error) {
    console.error("Error deleting file:", error);
    return [];
  }
};

// ─── Turning raw /analyze output into a saveable session ──────────────────

// Short coaching line for a single rep based on its weakest dimension.
const repFeedback = ({ depth, lockout, align }) => {
  const issues = [];
  if (depth < 70) issues.push("go deeper (past 90°)");
  if (lockout < 70) issues.push("lock out fully at the top");
  if (align < 70) issues.push("keep your hips in a straight line");
  if (!issues.length) return "Clean rep — full depth, lockout, and alignment.";
  return "Fix: " + issues.join(", ") + ".";
};

// One summary tip for the whole set, targeting the weakest dimension on average.
const summariseWeakness = (reps) => {
  const avg = (fn) => reps.reduce((s, r) => s + fn(r), 0) / reps.length;
  const d = avg((r) => depthScore(r.lowestElbowAngle));
  const l = avg((r) => lockoutScore(r.highestElbowAngle));
  const a = avg((r) => alignScore(r.avgHipAngle));
  const worst = Math.min(d, l, a);
  if (worst >= 80)
    return "Excellent set — consistent depth, lockout, and alignment across all reps.";
  if (worst === d)
    return "Work on depth — bend your elbows past 90° at the bottom of each rep.";
  if (worst === l)
    return "Work on lockout — fully straighten your arms at the top of each rep.";
  return "Work on alignment — keep your hips level so your body stays a straight plank.";
};

/**
 * Detect individual push-ups from the per-frame angles returned by /analyze
 * and score each one. A rep is one "extended → bottom → extended" cycle of
 * the elbow angle; the hip angle over the rep gives the alignment score.
 * @param {Array} frames - flat list of frame feature objects
 * @returns {Array} reps - [{ repNumber, lowestElbowAngle, highestElbowAngle, avgHipAngle, score, feedback }]
 */
const segmentReps = (frames) => {
  const TOP = 150; // elbow considered "extended" above this
  const BOTTOM = 110; // elbow considered "at the bottom" below this

  const reps = [];
  let phase = "up";
  let curMin = Infinity;
  let curMax = -Infinity;
  let hipSum = 0;
  let hipCount = 0;

  const finishRep = () => {
    const avgHip = hipCount ? hipSum / hipCount : 0;
    const s = scoreRep(curMin, curMax, avgHip);
    reps.push({
      repNumber: reps.length + 1,
      lowestElbowAngle: Number(curMin.toFixed(1)),
      highestElbowAngle: Number(curMax.toFixed(1)),
      avgHipAngle: Number(avgHip.toFixed(1)),
      score: s.total,
      feedback: repFeedback(s),
    });
    phase = "up";
    curMin = Infinity;
    curMax = -Infinity;
    hipSum = 0;
    hipCount = 0;
  };

  for (const f of frames) {
    const angle = f && Number(f.elbow_angle);
    if (!angle || Number.isNaN(angle)) continue; // skip padding / no-pose frames

    const hip = Number(f.hip_angle) || 0;
    curMin = Math.min(curMin, angle);
    curMax = Math.max(curMax, angle);
    if (hip > 0) {
      hipSum += hip;
      hipCount += 1;
    }

    if (phase === "up" && angle <= BOTTOM) {
      phase = "down";
    } else if (phase === "down" && angle >= TOP) {
      finishRep();
    }
  }

  return reps;
};

/**
 * Build a session object from a raw /analyze API response so it can be saved
 * with saveSession(). Pulls out each individual push-up, scores it, and
 * produces a session score + coaching tip — all rule-based, no ML model.
 * @param {Object} result - the JSON returned by POST /analyze
 */
export const buildSessionFromAnalysis = (result = {}) => {
  // Flatten the 30-frame sequences back into one continuous frame list.
  const frames = Array.isArray(result.sequences) ? result.sequences.flat() : [];

  const reps = segmentReps(frames);

  const score = reps.length
    ? clampScore(reps.reduce((sum, r) => sum + r.score, 0) / reps.length)
    : 0;

  const feedback = reps.length
    ? summariseWeakness(reps)
    : "No full reps detected — make sure your whole body is in frame and try again.";

  return {
    id: Date.now().toString(),
    date: new Date().toLocaleDateString(),
    count: reps.length,
    points: reps.length * 100,
    reps,
    score,
    label: sessionLabel(score),
    totalFrames: Number(result.total_frames) || frames.length,
    // The existing UI renders this as the "AI Insights" block.
    geminiFeedback: feedback,
  };
};

export async function clearAllDeviceData() {
  await clearHistoryFile();

  // Clear any additional storage here, for example:
  // await AsyncStorage.clear();
  // await FileSystem.deleteAsync(...);
}
