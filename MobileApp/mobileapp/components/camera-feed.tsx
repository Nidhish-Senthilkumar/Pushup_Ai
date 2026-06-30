import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

// ─── CONFIG ──────────────────────────────────────────────
// This must be your computer's current LAN IP (run `ipconfig` / check Wi-Fi).
// The phone and this computer must be on the SAME Wi-Fi network.
const API_URL = "http://10.0.0.199:5000/analyze";

// ─── Helpers ─────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Timeout Fetch Helper ────────────────────────────────
const fetchWithTimeout = (
  url: string,
  options: any,
  timeoutMs: number = 90000,
) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Request timeout"));
    }, timeoutMs);

    fetch(url, options)
      .then((res) => {
        clearTimeout(timeoutId);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
};

// ─── Component ───────────────────────────────────────────
export function CameraFeed({
  isRecording,
  onCameraReady,
  onResult,
}: {
  isRecording: boolean;
  onCameraReady?: () => void;
  onResult?: (result: any) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const cameraRef = useRef<any>(null);
  const recordingPromiseRef = useRef<Promise<any> | null>(null);
  const isRecordingRef = useRef(false);

  // ─── Upload with Data Size Tracking ─────────────────────
  const uploadVideo = async (uri: string) => {
    console.log("[CameraFeed] 📤 Starting upload:", uri);

    try {
      // Get video file size
      const fileInfo = await fetch(uri);
      const blob = await fileInfo.blob();
      const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      console.log(`[CameraFeed] 📊 Video Size Sent: ${fileSizeMB} MB`);
    } catch (e) {
      console.log("[CameraFeed] Could not get file size");
    }

    const formData = new FormData();
    formData.append("video", {
      uri,
      name: "pushup.mp4",
      type: "video/mp4",
    } as any);

    const startTime = Date.now();

    const response = await fetchWithTimeout(
      API_URL,
      {
        method: "POST",
        body: formData,
      },
      90000,
    ); // 90 second timeout

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`[CameraFeed] ⏱️ Upload Duration: ${duration} seconds`);

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const resultText = await response.text();
    const resultSizeKB = (resultText.length / 1024).toFixed(2);
    console.log(`[CameraFeed] 📥 Response Size Received: ${resultSizeKB} KB`);

    const result = JSON.parse(resultText);

    console.log("✅ Backend Success:");
    console.log(`   • Total Frames: ${result.total_frames}`);
    console.log(`   • Sequences: ${result.num_sequences} × 30 frames`);

    return result;
  };

  // ─── Camera Ready ───────────────────────────────────────
  const handleCameraReady = () => {
    console.log("[CameraFeed] onCameraReady fired");
    setTimeout(() => {
      setCameraReady(true);
      console.log("[CameraFeed] camera marked READY");
      onCameraReady?.();
    }, 1300);
  };

  // ─── Recording Logic ────────────────────────────────────
  const startRecording = async () => {
    if (!cameraRef.current || isRecordingRef.current) return;
    try {
      isRecordingRef.current = true;
      console.log("[CameraFeed] 🎥 starting recording...");
      await sleep(500);
      recordingPromiseRef.current = cameraRef.current.recordAsync({
        quality: "480p",
        maxDuration: 120,
      });
      const video = await recordingPromiseRef.current;
      if (video?.uri) await handleVideoResult(video.uri);
    } catch (err: any) {
      console.log("[CameraFeed] RECORD ERROR:", err?.message || err);
    } finally {
      isRecordingRef.current = false;
      recordingPromiseRef.current = null;
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && isRecordingRef.current) {
      console.log("[CameraFeed] ⏹️ stopping recording...");
      cameraRef.current.stopRecording();
    }
  };

  const handleVideoResult = async (uri: string) => {
    setIsLoading(true);
    try {
      const result = await uploadVideo(uri);
      onResult?.(result);
    } catch (err: any) {
      console.error("[CameraFeed] Upload error:", err);
    } finally {
      setIsLoading(false);
      console.log("[CameraFeed] cleanup done");
    }
  };

  // ─── Effect ─────────────────────────────────────────────
  useEffect(() => {
    if (!cameraReady) return;

    if (isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [isRecording, cameraReady]);

  // Permission Screen
  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.text}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
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
        mode="video"
        onCameraReady={handleCameraReady}
      />

      {isLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#00adb5" />
          <Text style={styles.overlayText}>Uploading & Processing...</Text>
        </View>
      )}

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {isRecording ? "● Recording" : "Ready"}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
  },
  camera: { flex: 1 },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
  },
  text: { color: "#fff", marginBottom: 10 },
  button: {
    padding: 12,
    backgroundColor: "#3498db",
    borderRadius: 8,
  },
  btnText: { color: "#fff" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  overlayText: { color: "#fff", marginTop: 10 },
  badge: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 8,
  },
  badgeText: { color: "#fff" },
});
