// websitejavascript.js
// Starts MediaPipe Pose camera for exactly 10s when user clicks the start button.

const startBtn = document.getElementById('startRecording');
const recordStatus = document.getElementById('recordStatus');
const videoElement = document.getElementById('input_video');

let camera = null;
let pose = null;
let recording = false;
let collectedFrames = []; // each entry: {timestamp, landmarks}
let stopTimer = null;

const overlay = document.getElementById('overlay');
const overlayCtx = overlay ? overlay.getContext('2d') : null;

function resizeOverlay() {
  if (!overlay || !videoElement) return;
  const container = document.querySelector('.camera-box');
  if (!container) return;
  // Use the video's displayed bounding box so we match any letterboxing/pillarboxing
  const vRect = videoElement.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  const left = vRect.left - cRect.left;
  const top = vRect.top - cRect.top;
  const width = Math.max(1, Math.round(vRect.width));
  const height = Math.max(1, Math.round(vRect.height));

  // Position and size the overlay to match the video display area
  overlay.style.left = left + 'px';
  overlay.style.top = top + 'px';
  overlay.style.width = width + 'px';
  overlay.style.height = height + 'px';

  // Set canvas resolution to match displayed pixel size for crisp drawing
  overlay.width = width;
  overlay.height = height;
}

const POSE_CONNECTIONS = [
  [11,13],[13,15], // left shoulder->elbow->wrist
  [12,14],[14,16], // right shoulder->elbow->wrist
  [11,12], // shoulders
  [23,24], // hips
  [11,23],[12,24], // shoulders to hips
  [23,25],[25,27], // left hip->knee->ankle
  [24,26],[26,28]  // right hip->knee->ankle
];

function drawPose(landmarks) {
  if (!overlayCtx) return;
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  if (!landmarks) return;

  overlayCtx.lineWidth = 4;
  overlayCtx.strokeStyle = 'rgba(0,200,0,0.9)';
  overlayCtx.fillStyle = 'rgba(0,200,0,0.9)';

  // Draw connections
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

  // Draw landmarks
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
  // draw skeleton while camera pipelines results; only show overlay during recording
  if (overlay) resizeOverlay();
  if (recording && results.poseLandmarks) {
    drawPose(results.poseLandmarks);
  } else if (overlay && !recording) {
    // clear/hide overlay when not recording
    overlayCtx && overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  }

  const ts = Date.now();
  if (results.poseLandmarks) {
    // Deep-copy landmarks into plain arrays to make them JSON-safe
    const landmarks = results.poseLandmarks.map(l => ({x: l.x, y: l.y, z: l.z, visibility: l.visibility}));
    collectedFrames.push({timestamp: ts, landmarks});
  } else {
    collectedFrames.push({timestamp: ts, landmarks: null});
  }
}

async function startRecording() {
  if (recording) return;
  recording = true;
  collectedFrames = [];
  recordStatus.textContent = 'Recording...';

  // Initialize MediaPipe Pose
  pose = new Pose({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`});
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  pose.onResults(onResults);

  // Start camera
  camera = new Camera(videoElement, {
    onFrame: async () => {
      await pose.send({image: videoElement});
    },
    width: 640,
    height: 480
  });
  camera.start();

  // show overlay while recording
  if (overlay) overlay.style.display = 'block';

  // Stop after 10 seconds
  stopTimer = setTimeout(stopRecording, 10000);
}

function stopRecording() {
  if (!recording) return;
  recording = false;
  recordStatus.textContent = 'Processing...';

  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }

  // Stop camera and pose
  try {
    if (camera) {
      camera.stop();
      camera = null;
    }
  } catch (e) {
    console.warn('Error stopping camera', e);
  }

  try {
    if (pose) {
      pose.close();
      pose = null;
    }
  } catch (e) {
    console.warn('Error closing pose', e);
  }

  // hide overlay when recording stops
  if (overlay) overlay.style.display = 'none';

  recordStatus.textContent = `Recorded ${collectedFrames.length} frames`;

  // Prepare payload for backend
  const payload = {
    recordedAt: new Date().toISOString(),
    durationMs: collectedFrames.length > 1 ? (collectedFrames[collectedFrames.length-1].timestamp - collectedFrames[0].timestamp) : 0,
    frames: collectedFrames
  };

  // Store payload on window for manual inspection or later send
  window.latestPoseRecording = payload;

  // Optionally send to backend now (uncomment and set correct endpoint)
  // sendToBackend(payload);
}

async function sendToBackend(payload) {
  try {
    const res = await fetch('http://localhost:5000/upload_pose_data', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();
    recordStatus.textContent = 'Uploaded';
    return data;
  } catch (err) {
    console.error('Upload failed', err);
    recordStatus.textContent = 'Upload failed';
    return null;
  }
}

startBtn.addEventListener('click', () => {
  startRecording();
});

// After recording completes, automatically send to backend and update UI
async function handlePostRecording() {
  const payload = window.latestPoseRecording;
  if (!payload) return;
  recordStatus.textContent = 'Uploading...';
  const resp = await sendToBackend(payload);
  if (!resp) return;

  // Update UI elements if present
  const pushupEl = document.getElementById('pushupCount');
  const formEl = document.getElementById('formAccuracy');
  const tipEl = document.getElementById('aiTip');
  const statusGood = document.getElementById('aiStatusGood');
  const statusBad = document.getElementById('aiStatusBad');
  const progressBar = document.getElementById('progressBar');

  if (pushupEl && typeof resp.pushups !== 'undefined') pushupEl.textContent = resp.pushups;
  if (formEl && typeof resp.form_accuracy !== 'undefined') formEl.textContent = Math.round(resp.form_accuracy) + '%';
  if (tipEl && resp.tip) tipEl.textContent = resp.tip;

  if (statusGood && statusBad) {
    if (resp.form_accuracy >= 70) {
      statusGood.style.display = 'block';
      statusBad.style.display = 'none';
    } else {
      statusGood.style.display = 'none';
      statusBad.style.display = 'block';
    }
  }

  if (progressBar && typeof resp.form_accuracy !== 'undefined') {
    progressBar.style.width = Math.min(100, Math.max(0, resp.form_accuracy)) + '%';
  }
}

// Observe when window.latestPoseRecording is set after stopRecording
const originalStop = stopRecording;
stopRecording = function() {
  originalStop.apply(this, arguments);
  // small timeout to ensure window.latestPoseRecording is set
  setTimeout(handlePostRecording, 200);
}