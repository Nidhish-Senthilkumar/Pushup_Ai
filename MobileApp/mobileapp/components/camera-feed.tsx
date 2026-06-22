import React, { useState, useRef, useEffect, useCallback } from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Circle } from "react-native-svg";

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import "@tensorflow/tfjs-backend-cpu";
import * as poseDetection from "@tensorflow-models/pose-detection";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PoseFrame = {
  timestamp: number;
  keypoints: poseDetection.Keypoint[];
};

interface CameraFeedProps {
  isRecording: boolean;
  onCameraReady?: () => void;
  onDataCaptured?: (framesArray: PoseFrame[]) => void;
}

// Target ~20 FPS
const CAPTURE_INTERVAL_MS = 50;
const KEYPOINT_SCORE_THRESHOLD = 0.35;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CameraFeed({
  isRecording,
  onCameraReady,
  onDataCaptured,
}: CameraFeedProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [detectedLandmarks, setDetectedLandmarks] = useState<
    poseDetection.Keypoint[]
  >([]);
  const [modelReady, setModelReady] = useState(false);
  const [photoDimensions, setPhotoDimensions] = useState<{ width: number; height: number } | null>(null);

  const cameraRef = useRef<any>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const frameDataLog = useRef<PoseFrame[]>([]);
  const captureLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  const isCapturingRef = useRef(false); // Prevent overlapping captures

  // Load Model
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await tf.ready();
        if (cancelled) return;

        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
          },
        );

        if (cancelled) return;
        detectorRef.current = detector;
        setModelReady(true);
        console.log("[PoseDetection] MoveNet ready");
      } catch (e) {
        console.error("[PoseDetection] Failed to load model:", e);
      }
    })();

    return () => {
      cancelled = true;
      detectorRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Frame capture
  const captureFrame = useCallback(async () => {
    if (!detectorRef.current || !cameraRef.current || isCapturingRef.current) return;

    isCapturingRef.current = true;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        shutterSound: false,
        quality: 0.25, // Lower quality = faster
      });

      if (!photo?.base64) return;

      setPhotoDimensions({ width: photo.width, height: photo.height });

      // Proper JPEG decoding
      const imageBytes = base64ToUint8Array(photo.base64);
      const { decodeJpeg } = await import("@tensorflow/tfjs-react-native");
      const imageTensor = decodeJpeg(imageBytes);

      const poses = await detectorRef.current.estimatePoses(imageTensor as any);
      imageTensor.dispose();

      if (poses.length > 0) {
        const filtered = poses[0].keypoints.filter(
          (kp) => (kp.score ?? 0) >= KEYPOINT_SCORE_THRESHOLD
        );

        setDetectedLandmarks(filtered);

        if (isRecordingRef.current) {
          frameDataLog.current.push({
            timestamp: Date.now(),
            keypoints: filtered,
          });
        }
      } else {
        setDetectedLandmarks([]);
      }
    } catch (e) {
      console.warn("[PoseDetection] Frame error:", e);
    } finally {
      isCapturingRef.current = false;
    }
  }, []);

  // Start/stop loop
  useEffect(() => {
    if (isRecording && modelReady) {
      frameDataLog.current = [];
      captureLoopRef.current = setInterval(captureFrame, CAPTURE_INTERVAL_MS);
    } else {
      if (captureLoopRef.current) {
        clearInterval(captureLoopRef.current);
        captureLoopRef.current = null;
      }

      if (!isRecording && frameDataLog.current.length > 0) {
        console.log(`[PoseDetection] Captured ${frameDataLog.current.length} frames`);
        onDataCaptured?.(frameDataLog.current);
        frameDataLog.current = [];
      }
    }

    return () => {
      if (captureLoopRef.current) {
        clearInterval(captureLoopRef.current);
      }
    };
  }, [isRecording, modelReady, captureFrame, onDataCaptured]);

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.text}>Camera access is required for AI tracking.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.btnText}>🔓 Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        onCameraReady={onCameraReady}
      >
        <Svg style={StyleSheet.absoluteFill}>
          {detectedLandmarks.map((lm, index) => {
            const xPercent = photoDimensions ? (lm.x / photoDimensions.width) * 100 : 50;
            const yPercent = photoDimensions ? (lm.y / photoDimensions.height) * 100 : 50;

            return (
              <Circle
                key={index}
                cx={`${xPercent}%`}
                cy={`${yPercent}%`}
                r="6"
                fill="#00adb5"
                stroke="#fff"
                strokeWidth="1.5"
              />
            );
          })}
        </Svg>

        {!modelReady && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Loading pose model…</Text>
          </View>
        )}
      </CameraView>
    </View>
  );
}

// Styles (unchanged)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  camera: { flex: 1 },
  text: {
    color: "#9BA1A6",
    textAlign: "center",
    marginBottom: 20,
    fontSize: 14,
  },
  button: {
    backgroundColor: "#3498db",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignSelf: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  badge: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: { color: "#fff", fontSize: 11 },
});