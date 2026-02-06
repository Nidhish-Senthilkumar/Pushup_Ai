// Simplified Pushup Form Analyzer

const startBtn = document.getElementById("startRecording");
const statusText = document.getElementById("recordStatus");
const videoElement = document.getElementById("input_video");
const overlay = document.getElementById("overlay");
const overlayCtx = overlay?.getContext("2d");

let camera = null;
let pose = null;
let recording = false;
let collectedFrames = [];
let lstmModel = null;

const MODEL_PATH = "lstmjs_model/model.json";

function calculateAngle(a, b, c) {
  const ba = [a[0] - b[0], a[1] - b[1]];
  const bc = [c[0] - b[0], c[1] - b[1]];
  const dot = ba[0] * bc[0] + ba[1] * bc[1];
  const magBA = Math.sqrt(ba[0] ** 2 + ba[1] ** 2);
  const magBC = Math.sqrt(bc[0] ** 2 + bc[1] ** 2);
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

function extractFeatures(landmarks) {
  if (!landmarks || landmarks.length < 33) return null;

  const r_shoulder = [landmarks[12].x, landmarks[12].y];
  const r_elbow = [landmarks[14].x, landmarks[14].y];
  const r_wrist = [landmarks[16].x, landmarks[16].y];
  const r_hip = [landmarks[24].x, landmarks[24].y];
  const r_knee = [landmarks[26].x, landmarks[26].y];
  const l_shoulder = [landmarks[11].x, landmarks[11].y];
  const l_elbow = [landmarks[13].x, landmarks[13].y];
  const l_wrist = [landmarks[15].x, landmarks[15].y];
  const l_hip = [landmarks[23].x, landmarks[23].y];
  const l_knee = [landmarks[25].x, landmarks[25].y];

  const m_hip = [(r_hip[0] + l_hip[0]) / 2, (r_hip[1] + l_hip[1]) / 2];
  const m_knee = [(r_knee[0] + l_knee[0]) / 2, (r_knee[1] + l_knee[1]) / 2];
  const m_shoulder = [
    (l_shoulder[0] + r_shoulder[0]) / 2,
    (l_shoulder[1] + r_shoulder[1]) / 2,
  ];

  const r_shoulderAngle = 180 - calculateAngle(r_hip, r_shoulder, r_elbow);
  const l_shoulderAngle = 180 - calculateAngle(l_hip, l_shoulder, l_elbow);
  const hipAngle = calculateAngle(m_knee, m_hip, m_shoulder);
  const r_elbowAngle = calculateAngle(r_wrist, r_elbow, r_shoulder);
  const l_elbowAngle = calculateAngle(l_wrist, l_elbow, l_shoulder);

  return [
    hipAngle,
    r_shoulderAngle,
    l_shoulderAngle,
    r_elbowAngle,
    l_elbowAngle,
  ];
}

async function classifySequence(frames) {
  const features = frames
    .map((f) => (f.landmarks ? extractFeatures(f.landmarks) : null))
    .filter((f) => f !== null);

  sequence_length = 30;
  seq_arr = [];

  if (features.length === 0) return null;

  for (
    let i = 0;
    i + sequence_length <= features.length;
    i += sequence_length
  ) {
    seq_arr.push(features.slice(i, i + sequence_length));
  }

  try {
    const response = await fetch("http://localhost:5000/predict", {
      // Added http://
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: seq_arr }),
    });

    if (!response.ok) {
      // Fixed check
      throw new Error(`Server Error: ${response.status}`);
    }

    const data = await response.json(); // Added await

    return {
      // Return full object
      class: data.class,
    };
  } catch (error) {
    console.error("Prediction failed:", error);
    return null;
  }
}
function drawPose(landmarks) {
  if (!overlayCtx || !landmarks) return;

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

  const connections = [
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [11, 12],
    [23, 24],
    [11, 23],
    [12, 24],
    [23, 25],
    [25, 27],
    [24, 26],
    [26, 28],
  ];

  overlayCtx.strokeStyle = "lime";
  overlayCtx.lineWidth = 3;
  overlayCtx.fillStyle = "lime";

  for (const [a, b] of connections) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    if (p1 && p2) {
      overlayCtx.beginPath();
      overlayCtx.moveTo(p1.x * overlay.width, p1.y * overlay.height);
      overlayCtx.lineTo(p2.x * overlay.width, p2.y * overlay.height);
      overlayCtx.stroke();
    }
  }

  landmarks.forEach((lm) => {
    if (lm) {
      overlayCtx.beginPath();
      overlayCtx.arc(
        lm.x * overlay.width,
        lm.y * overlay.height,
        5,
        0,
        2 * Math.PI,
      );
      overlayCtx.fill();
    }
  });
}

function onResults(results) {
  if (recording && results.poseLandmarks) {
    drawPose(results.poseLandmarks);
    collectedFrames.push({
      timestamp: Date.now(),
      landmarks: results.poseLandmarks,
    });
  }
}

async function startRecording() {
  if (recording) return;

  recording = true;
  collectedFrames = [];
  statusText.textContent = "Recording...";
  startBtn.disabled = true;

  pose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
  });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  pose.onResults(onResults);

  camera = new Camera(videoElement, {
    onFrame: async () => await pose.send({ image: videoElement }),
    width: 640,
    height: 480,
  });
  camera.start();

  overlay.style.display = "block";

  setTimeout(stopRecording, 15000);
}

async function stopRecording() {
  if (!recording) return;

  recording = false;
  statusText.textContent = "Analyzing...";

  camera?.stop();
  pose?.close();
  camera = null;
  pose = null;

  overlay.style.display = "none";

  const result = await classifySequence(collectedFrames);

  if (result) {
    const messages = {
      0: "✓ Good form!",
      1: "⚠ Keep elbows closer to body",
      2: "⚠ Lower your hips",
      3: "⚠ Engage your core",
    };
    statusText.textContent = `${messages[result.class]}`;
    console.log("Result:", result);
  } else {
    statusText.textContent = "Could not analyze";
  }

  startBtn.disabled = false;
}

// Initialize
if (startBtn) {
  startBtn.addEventListener("click", startRecording);
}

startBtn.textContent = "Start Recording!";
startBtn.disabled = false;
