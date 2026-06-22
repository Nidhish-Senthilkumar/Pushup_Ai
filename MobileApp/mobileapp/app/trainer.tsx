import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CameraFeed, PoseFrame } from "../components/camera-feed";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionStatus =
  | "idle"
  | "countdown"
  | "recording"
  | "analyzing"
  | "complete"
  | "error";

const CLASS_TIPS: Record<number, string> = {
  0: "Great work! Keep your elbows close and stay aligned for even cleaner reps.",
  1: "Try tucking your elbows closer to your torso — about 45° from your body.",
  2: "Keep your hips level with your shoulders. Squeeze your glutes to hold the plank line.",
  3: "Straighten your knees and lock your legs — your body should be a rigid plank.",
};

const STATUS_LABELS: Record<SessionStatus, string> = {
  idle: "Ready to record",
  countdown: "Get ready…",
  recording: "Recording in progress…",
  analyzing: "Analysing your form…",
  complete: "Analysis complete",
  error: "Error",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrainerScreen() {
  const [cameraReady, setCameraReady] = useState(false);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [formLabel, setFormLabel] = useState<string>("");
  const [aiFeedback, setAiFeedback] = useState<string>("");
  const [frameCount, setFrameCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
    setStatus("idle");
  }, []);

  // Called by CameraFeed when recording stops and frames are ready
  const handleDataCaptured = useCallback((frames: PoseFrame[]) => {
    setFrameCount(frames.length);
    setStatus("analyzing");

    // TODO: send `frames` to your backend or AI API here
    // Each frame: { timestamp: number, keypoints: [{ x, y, score, name }] }
    console.log(
      `[TrainerScreen] Received ${frames.length} frames`,
      JSON.stringify(frames.slice(0, 2), null, 2),
    );

    // Placeholder — replace with real classification
    setTimeout(() => {
      setStatus("complete");
      setFormLabel("✓ Reps Evaluated");
      setAiFeedback(CLASS_TIPS[0]);
    }, 2000);
  }, []);

  const handleStartRecording = useCallback(() => {
    setStatus("recording");
    setFrameCount(0);
    setFormLabel("");
    setAiFeedback("");
  }, []);

  const handleStopRecording = useCallback(() => {
    setStatus("analyzing");
  }, []);

  // ─── Derived state ─────────────────────────────────────────────────────────

  const isActive = status === "countdown" || status === "recording";

  const recordButtonLabel =
    status === "countdown"
      ? "⏳ Get ready…"
      : status === "recording"
        ? "■ Stop Recording"
        : "▶ Start Recording";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ThemedView style={styles.wrapper}>
        <ThemedText type="title" style={styles.title}>
          AI Trainer
        </ThemedText>

        {/* Camera viewport */}
        <View style={styles.cameraContainer}>
          <CameraFeed
            isRecording={status === "recording"}
            onCameraReady={handleCameraReady}
            onDataCaptured={handleDataCaptured}
          />

          {/* Loading overlay until camera is ready */}
          {!cameraReady && status !== "error" && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color={Colors.dark.accent} />
              <ThemedText style={styles.loadingText}>
                Starting Camera…
              </ThemedText>
            </View>
          )}

          {/* Live frame counter while recording */}
          {status === "recording" && (
            <View style={styles.frameBadge}>
              <ThemedText style={styles.frameBadgeText}>
                {frameCount} frames
              </ThemedText>
            </View>
          )}
        </View>

        {/* Status row */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              status === "idle" && styles.dotIdle,
              status === "countdown" && styles.dotCountdown,
              status === "recording" && styles.dotRecording,
              status === "analyzing" && styles.dotAnalyzing,
              status === "complete" && styles.dotComplete,
              status === "error" && styles.dotError,
            ]}
          />
          <ThemedText style={styles.statusLabel}>
            {STATUS_LABELS[status]}
          </ThemedText>
        </View>

        {/* Record / Stop button */}
        {cameraReady && (
          <Pressable
            style={[styles.recordButton, isActive && styles.recordButtonActive]}
            onPress={isActive ? handleStopRecording : handleStartRecording}
            disabled={status === "analyzing"}
          >
            <ThemedText style={styles.recordButtonText}>
              {recordButtonLabel}
            </ThemedText>
          </Pressable>
        )}

        {/* Feedback panel */}
        <ScrollView
          style={styles.feedbackPanel}
          contentContainerStyle={styles.feedbackContent}
        >
          <ThemedText style={styles.feedbackTitle}>AI Coach</ThemedText>

          {status === "error" && (
            <ThemedView style={[styles.resultCard, styles.resultCardBad]}>
              <ThemedText style={styles.resultLabel}>⚠ Error</ThemedText>
              <ThemedText style={styles.resultSub}>{errorMsg}</ThemedText>
            </ThemedView>
          )}

          {status === "complete" && formLabel !== "" && (
            <ThemedView
              style={[
                styles.resultCard,
                formLabel.startsWith("✓")
                  ? styles.resultCardGood
                  : styles.resultCardBad,
              ]}
            >
              <ThemedText style={styles.resultLabel}>{formLabel}</ThemedText>
            </ThemedView>
          )}

          {aiFeedback !== "" && status === "complete" && (
            <ThemedView style={styles.tipCard}>
              <ThemedText style={styles.tipTitle}>How to improve</ThemedText>
              <ThemedText style={styles.tipText}>{aiFeedback}</ThemedText>
            </ThemedView>
          )}

          {(status === "idle" || status === "countdown") && (
            <ThemedView style={styles.tipCard}>
              <ThemedText style={styles.tipTitle}>Tips</ThemedText>
              <ThemedText style={styles.tipText}>
                Position your whole body in frame. Keep your elbows at ~45° and
                maintain a straight line from head to heels.
              </ThemedText>
            </ThemedView>
          )}

          {status === "recording" && (
            <ThemedView style={styles.tipCard}>
              <ThemedText style={styles.tipTitle}>Recording…</ThemedText>
              <ThemedText style={styles.tipText}>
                Capturing pose keypoints live. Press Stop when your set is done.
              </ThemedText>
            </ThemedView>
          )}

          {status === "analyzing" && (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color={Colors.dark.accent} />
              <ThemedText style={styles.analyzingText}>
                Processing {frameCount} captured frames…
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  wrapper: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginBottom: Spacing.three,
    textAlign: "center",
  },
  cameraContainer: {
    height: 280,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.dark.accent,
    marginBottom: Spacing.three,
    backgroundColor: Colors.dark.backgroundElement,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.dark.backgroundElement,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  frameBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(60,135,247,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 20,
  },
  frameBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.two,
    gap: Spacing.one,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotIdle: { backgroundColor: Colors.dark.textSecondary },
  dotCountdown: { backgroundColor: "#f39c12" },
  dotRecording: { backgroundColor: "#e74c3c" },
  dotAnalyzing: { backgroundColor: "#f39c12" },
  dotComplete: { backgroundColor: "#27ae60" },
  dotError: { backgroundColor: "#e74c3c" },
  statusLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  recordButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.three,
  },
  recordButtonActive: {
    backgroundColor: "#e74c3c",
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackPanel: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
  },
  feedbackContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginBottom: Spacing.two,
  },
  resultCard: {
    borderRadius: 10,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  resultCardGood: { backgroundColor: "#1a4731" },
  resultCardBad: { backgroundColor: "#4a1a1a" },
  resultLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  resultSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  tipCard: {
    backgroundColor: Colors.dark.background,
    borderRadius: 10,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  tipTitle: {
    color: Colors.dark.accent,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: Spacing.one,
  },
  tipText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.two,
  },
  analyzingText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
});
