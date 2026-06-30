import * as FileSystem from 'expo-file-system/legacy';

// path of file
const fileUri = FileSystem.documentDirectory + 'pushup_history.json';

// ─── Class metadata (mirrors the LSTM output from /analyze) ───────────────
// predicted_class: 0 = Good, 1 = Elbows Wide, 2 = Hips High, 3 = Sagging
const CLASS_LABELS = [
  '✅ Perfect Form',
  'Elbows Too Wide',
  'Hips Sagging',
  'Knees Not Locked',
];

const CLASS_TIPS = [
  'Great work! Keep your elbows close and stay aligned for even cleaner reps.',
  'Try tucking your elbows closer to your torso — about 45° from your body.',
  'Keep your hips level with your shoulders. Squeeze your glutes to hold the plank line.',
  'Straighten your knees and lock your legs — your body should be a rigid plank.',
];

// Returns the next sequential session number (1, 2, 3 …) for a history list.
const nextSessionNumber = (history) => {
  const list = Array.isArray(history) ? history : [];
  const max = list.reduce(
    (m, s) => Math.max(m, (s && Number(s.sessionNumber)) || 0),
    0
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
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(updatedHistory));

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

// Short coaching line for a single rep based on its depth + lockout.
const repFeedback = (lowest, highest) => {
  const depthOK = lowest <= 95;   // went past ~90° at the bottom
  const extOK = highest >= 165;   // locked out near the top
  if (depthOK && extOK) return 'Clean rep — full depth and lockout.';
  if (!depthOK && !extOK) return 'Go deeper and fully extend at the top.';
  if (!depthOK) return 'Lower further — aim past 90° at the bottom.';
  return 'Lock out your elbows fully at the top.';
};

/**
 * Detect individual push-ups from the per-frame elbow angles returned by
 * /analyze and summarise each one. A rep is one "extended → bottom → extended"
 * cycle of the elbow angle.
 * @param {Array} frames - flat list of frame feature objects
 * @returns {Array} reps - [{ repNumber, lowestElbowAngle, highestElbowAngle, feedback }]
 */
const segmentReps = (frames) => {
  const TOP = 150;    // elbow considered "extended" above this
  const BOTTOM = 110; // elbow considered "at the bottom" below this

  const reps = [];
  let phase = 'up';
  let curMin = Infinity;
  let curMax = -Infinity;

  for (const f of frames) {
    const angle = f && Number(f.elbow_angle);
    if (!angle || Number.isNaN(angle)) continue; // skip padding / no-pose frames

    curMin = Math.min(curMin, angle);
    curMax = Math.max(curMax, angle);

    if (phase === 'up' && angle <= BOTTOM) {
      phase = 'down';
    } else if (phase === 'down' && angle >= TOP) {
      // a full rep just completed
      reps.push({
        repNumber: reps.length + 1,
        lowestElbowAngle: Number(curMin.toFixed(1)),
        highestElbowAngle: Number(curMax.toFixed(1)),
        feedback: repFeedback(curMin, curMax),
      });
      phase = 'up';
      curMin = Infinity;
      curMax = -Infinity;
    }
  }

  return reps;
};

/**
 * Build a session object from a raw /analyze API response so it can be saved
 * with saveSession(). Pulls out each individual push-up and the AI feedback.
 * @param {Object} result - the JSON returned by POST /analyze
 */
export const buildSessionFromAnalysis = (result = {}) => {
  // Flatten the 30-frame sequences back into one continuous frame list.
  const frames = Array.isArray(result.sequences)
    ? result.sequences.flat()
    : [];

  const reps = segmentReps(frames);

  const cls = Number(result.predicted_class) || 0;
  const label = CLASS_LABELS[cls] || `Form Class ${cls}`;
  const tip = CLASS_TIPS[cls] || CLASS_TIPS[0];

  return {
    id: Date.now().toString(),
    date: new Date().toLocaleDateString(),
    count: reps.length,
    points: reps.length * 100,
    reps,
    predictedClass: cls,
    label,
    confidence: Number(result.confidence) || 0,
    totalFrames: Number(result.total_frames) || frames.length,
    // The existing UI renders this as the "AI Insights" block.
    geminiFeedback: tip,
  };
};
