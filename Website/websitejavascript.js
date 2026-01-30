// websitejavascript.js
// Starts MediaPipe Pose camera for exactly 10s when user clicks the start button.
// Now includes LSTM model for real-time pushup form classification

const startBtn = document.getElementById("startRecording");
const recordStatus = document.getElementById("recordStatus");
const videoElement = document.getElementById("input_video");

let camera = null;
let pose = null;
let recording = false;
let previewing = false;
let collectedFrames = [];
let stopTimer = null;
let countdownTimer = null;
let countdownRemaining = 0;

// LSTM Model variables
let lstmModel = null;
let modelLoaded = false;
const MODEL_PATH = './lstmjs_model/model.json';

const overlay = document.getElementById("overlay");
const overlayCtx = overlay ? overlay.getContext("2d") : null;

// Load LSTM model on page load
async function loadLSTMModel() {
  try {
    recordStatus.textContent = "Loading AI model...";
    lstmModel = await tf.loadLayersModel(MODEL_PATH);
    modelLoaded = true;
    recordStatus.textContent = "Model loaded! Ready to record.";
    console.log("✓ LSTM model loaded successfully");
    console.log("Model input shape:", lstmModel.inputs[0].shape);
    console.log("Model output shape:", lstmModel.outputs[0].shape);
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = "Start Recording (10s)";
    }
  } catch (error) {
    console.error("Failed to load LSTM model:", error);
    recordStatus.textContent = "Error loading model. Check console.";
    modelLoaded = false;
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = "Start Recording (10s)";
    }
  }
}

// Initialize model loading when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadLSTMModel);
} else {
  loadLSTMModel();
}

// Calculate angle between three points (matching Python version)
function calculateAngle(a, b, c) {
  const ba = [a[0] - b[0], a[1] - b[1]];
  const bc = [c[0] - b[0], c[1] - b[1]];
  
  const dotProduct = ba[0] * bc[0] + ba[1] * bc[1];
  const magnitudeBA = Math.sqrt(ba[0] * ba[0] + ba[1] * ba[1]);
  const magnitudeBC = Math.sqrt(bc[0] * bc[0] + bc[1] * bc[1]);
  
  const cosineAngle = dotProduct / (magnitudeBA * magnitudeBC);
  const clampedCosine = Math.max(-1.0, Math.min(1.0, cosineAngle));
  const angleRadians = Math.acos(clampedCosine);
  const angleDegrees = angleRadians * (180 / Math.PI);
  
  return angleDegrees;
}

// Extract features from landmarks (matching Python data collection)
function extractFeaturesFromLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 33) return null;

  // Right side landmarks
  const r_shoulder = [landmarks[12].x, landmarks[12].y];
  const r_elbow = [landmarks[14].x, landmarks[14].y];
  const r_wrist = [landmarks[16].x, landmarks[16].y];
  const r_hip = [landmarks[24].x, landmarks[24].y];
  const r_knee = [landmarks[26].x, landmarks[26].y];

  // Left side landmarks
  const l_shoulder = [landmarks[11].x, landmarks[11].y];
  const l_elbow = [landmarks[13].x, landmarks[13].y];
  const l_wrist = [landmarks[15].x, landmarks[15].y];
  const l_hip = [landmarks[23].x, landmarks[23].y];
  const l_knee = [landmarks[25].x, landmarks[25].y];

  // Calculate midpoints
  const m_hip = [(r_hip[0] + l_hip[0]) / 2, (r_hip[1] + l_hip[1]) / 2];
  const m_knee = [(r_knee[0] + l_knee[0]) / 2, (r_knee[1] + l_knee[1]) / 2];
  const m_shoulder = [(l_shoulder[0] + r_shoulder[0]) / 2, (l_shoulder[1] + r_shoulder[1]) / 2];

  // Calculate angles (matching Python exactly)
  const r_shoulderang = 180 - calculateAngle(r_hip, r_shoulder, r_elbow);
  const l_shoulderang = 180 - calculateAngle(l_hip, l_shoulder, l_elbow);
  const hipang = calculateAngle(m_knee, m_hip, m_shoulder);
  const r_elbowang = calculateAngle(r_wrist, r_elbow, r_shoulder);
  const l_elbowang = calculateAngle(l_wrist, l_elbow, l_shoulder);

  // Only return features if elbow angle indicates pushup position (matching Python logic)
  if (r_elbowang < 140) {
    return [hipang, r_shoulderang, l_shoulderang, r_elbowang, l_elbowang];
  }
  
  return null;
}

// Classify sequence using LSTM model
async function classifySequence(frames) {
  if (!modelLoaded || !lstmModel) {
    console.warn("Model not loaded yet");
    return null;
  }

  try {
    // Extract features from each frame
    const sequenceFeatures = [];
    for (const frame of frames) {
      if (frame.landmarks) {
        const features = extractFeaturesFromLandmarks(frame.landmarks);
        if (features) {
          sequenceFeatures.push(features);
        }
      }
    }

    if (sequenceFeatures.length === 0) {
      console.warn("No valid features extracted from frames");
      return null;
    }

    console.log(`Extracted ${sequenceFeatures.length} feature frames`);

    // Prepare input for LSTM: shape should be [1, timesteps, features]
    const inputTensor = tf.tensor3d([sequenceFeatures]);
    
    console.log("Input tensor shape:", inputTensor.shape);

    // Run prediction
    const prediction = lstmModel.predict(inputTensor);
    const predictionData = await prediction.data();
    
    // Get predicted class (0=good, 1=elbows wide, 2=hips high, 3=sagging)
    const predictedClass = prediction.argMax(-1).dataSync()[0];
    const confidence = predictionData[predictedClass];

    // Cleanup tensors
    inputTensor.dispose();
    prediction.dispose();

    const labelNames = ["Good Pushup", "Elbows Wide", "Hips High", "Sagging"];
    
    return {
      predictedClass,
      confidence,
      labelName: labelNames[predictedClass],
      allProbabilities: Array.from(predictionData)
    };
  } catch (error) {
    console.error("Error during classification:", error);
    return null;
  }
}

function resizeOverlay() {
  if (!overlay || !videoElement) return;
  const container = document.querySelector(".camera-box");
  if (!container) return;
  const vRect = videoElement.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  const left = vRect.left - cRect.left;
  const top = vRect.top - cRect.top;
  const width = Math.max(1, Math.round(vRect.width));
  const height = Math.max(1, Math.round(vRect.height));

  overlay.style.left = left + "px";
  overlay.style.top = top + "px";
  overlay.style.width = width + "px";
  overlay.style.height = height + "px";

  overlay.width = width;
  overlay.height = height;
}

const POSE_CONNECTIONS = [
  [11, 13], [13, 15], // left shoulder->elbow->wrist
  [12, 14], [14, 16], // right shoulder->elbow->wrist
  [11, 12], // shoulders
  [23, 24], // hips
  [11, 23], [12, 24], // shoulders to hips
  [23, 25], [25, 27], // left hip->knee->ankle
  [24, 26], [26, 28], // right hip->knee->ankle
];

function drawPose(landmarks) {
  if (!overlayCtx) return;
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  if (!landmarks) return;

  overlayCtx.lineWidth = 4;
  overlayCtx.strokeStyle = "rgba(0,200,0,0.9)";
  overlayCtx.fillStyle = "rgba(0,200,0,0.9)";

  for (const conn of POSE_CONNECTIONS) {
    const a = landmarks[conn[0]];
    const b = landmarks[conn[1]];
    if (!a || !b) continue;
    const ax = a.x * overlay.width;
    const ay = a.y * overlay.height;
    const bx = b.x * overlay.width;
    const by = b.y * overlay.height;
    overlayCtx.beginPath();
    overlayCtx.moveTo(ax, ay);
    overlayCtx.lineTo(bx, by);
    overlayCtx.stroke();
  }

  for (const lm of landmarks) {
    if (!lm) continue;
    const x = lm.x * overlay.width;
    const y = lm.y * overlay.height;
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, 6, 0, 2 * Math.PI);
    overlayCtx.fill();
  }
}

function onResults(results) {
  if (overlay) resizeOverlay();
  if ((recording || previewing) && results.poseLandmarks) {
    drawPose(results.poseLandmarks);
  } else if (overlay && !recording && !previewing) {
    overlayCtx && overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  }

  if (!recording) return;

  const ts = Date.now();
  if (results.poseLandmarks) {
    const landmarks = results.poseLandmarks.map((l) => ({
      x: l.x,
      y: l.y,
      z: l.z,
      visibility: l.visibility,
    }));
    collectedFrames.push({ timestamp: ts, landmarks });
  } else {
    collectedFrames.push({ timestamp: ts, landmarks: null });
  }
}

function startCameraPreview() {
  if (camera || pose) return;
  pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}` });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  pose.onResults(onResults);

  camera = new Camera(videoElement, {
    onFrame: async () => {
      await pose.send({ image: videoElement });
    },
    width: 640,
    height: 480,
  });
  camera.start();

  previewing = true;
  if (overlay) overlay.style.display = "block";
}

function stopCameraPreview() {
  try {
    if (camera) {
      camera.stop();
      camera = null;
    }
  } catch (e) {
    console.warn("Error stopping camera", e);
  }
  try {
    if (pose) {
      pose.close();
      pose = null;
    }
  } catch (e) {
    console.warn("Error closing pose", e);
  }
  previewing = false;
  if (overlay) overlay.style.display = "none";
}

function startWithCountdown(seconds = 5) {
  if (recording || countdownTimer) return;
  const countdownEl = document.getElementById("countdownOverlay");
  countdownRemaining = seconds;
  if (countdownEl) {
    countdownEl.textContent = countdownRemaining;
    countdownEl.classList.add("show");
    countdownEl.style.display = "block";
  }
  startBtn.disabled = true;
  recordStatus.textContent = `Starting in ${countdownRemaining}...`;

  startCameraPreview();

  countdownTimer = setInterval(() => {
    countdownRemaining -= 1;
    if (countdownEl) countdownEl.textContent = countdownRemaining > 0 ? countdownRemaining : "Go!";
    if (countdownRemaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      if (countdownEl) {
        setTimeout(() => {
          countdownEl.classList.remove("show");
          countdownEl.style.display = "none";
        }, 300);
      }
      startRecording();
    } else {
      recordStatus.textContent = `Starting in ${countdownRemaining}...`;
    }
  }, 1000);
}

async function startRecording() {
  if (recording) return;
  recording = true;
  collectedFrames = [];
  recordStatus.textContent = "Recording...";
  startBtn.disabled = true;

  if (!pose || !camera) {
    pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}` });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    pose.onResults(onResults);

    camera = new Camera(videoElement, {
      onFrame: async () => {
        await pose.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });
    camera.start();
  }

  previewing = false;
  if (overlay) overlay.style.display = "block";

  stopTimer = setTimeout(stopRecording, 10000);
}

async function stopRecording() {
  if (!recording) return;
  recording = false;
  recordStatus.textContent = "Processing...";

  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }

  try {
    if (camera) {
      camera.stop();
      camera = null;
    }
  } catch (e) {
    console.warn("Error stopping camera", e);
  }

  try {
    if (pose) {
      pose.close();
      pose = null;
    }
  } catch (e) {
    console.warn("Error closing pose", e);
  }

  if (overlay) overlay.style.display = "none";

  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  stopCameraPreview();

  recordStatus.textContent = `Recorded ${collectedFrames.length} frames`;

  // Classify using LSTM model
  if (modelLoaded && collectedFrames.length > 0) {
    recordStatus.textContent = "Analyzing form...";
    const result = await classifySequence(collectedFrames);
    
    if (result) {
      console.log("Classification result:", result);
      
      // Update UI with result
      const tipEl = document.getElementById("aiTip");
      if (tipEl) {
        const tipMessages = {
          0: "✓ Good Pushup! Keep up the great form!",
          1: "⚠ Elbows are wide — keep your elbows closer to your body.",
          2: "⚠ Hips are high — lower your hips so your body forms a straight line.",
          3: "⚠ Knees are sagging — keep your core engaged and body straight."
        };
        tipEl.textContent = tipMessages[result.predictedClass] || result.labelName;
      }
      
      recordStatus.textContent = `Analysis complete: ${result.labelName} (${(result.confidence * 100).toFixed(1)}% confident)`;
    } else {
      recordStatus.textContent = "Could not analyze form";
    }
  }

  if (startBtn) startBtn.disabled = false;

  // Prepare payload for backend (optional)
  const payload = {
    recordedAt: new Date().toISOString(),
    durationMs:
      collectedFrames.length > 1
        ? collectedFrames[collectedFrames.length - 1].timestamp -
          collectedFrames[0].timestamp
        : 0,
    frames: collectedFrames,
  };

  window.latestPoseRecording = payload;
}

async function sendToBackend(payload) {
  try {
    const res = await fetch("http://localhost:5000/upload_pose_data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();
    recordStatus.textContent = "Uploaded";
    return data;
  } catch (err) {
    console.error("Upload failed", err);
    recordStatus.textContent = "Upload failed";
    return null;
  }
}

if (startBtn) {
  startBtn.addEventListener("click", () => {
    startWithCountdown(5);
  });
}

// Optional: After recording completes, send to backend
async function handlePostRecording() {
  const payload = window.latestPoseRecording;
  if (!payload) return;
  
  // Uncomment to enable backend upload
  // recordStatus.textContent = "Uploading...";
  // const resp = await sendToBackend(payload);
  // if (!resp) return;

  // Update UI elements if backend response is used
  // const pushupEl = document.getElementById("pushupCount");
  // if (pushupEl && typeof resp.pushups !== "undefined")
  //   pushupEl.textContent = resp.pushups;
}

const originalStop = stopRecording;
stopRecording = async function () {
  await originalStop.apply(this, arguments);
  setTimeout(handlePostRecording, 200);
};