import React, { useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type RNMessage =
  | { type: "ready" }
  | { type: "status"; status: "countdown" | "recording" | "analyzing" }
  | { type: "frame"; count: number }
  | { type: "result"; class: number | null; label: string; frameCount?: number }
  | { type: "ai_feedback"; message: string }
  | { type: "error"; message: string };

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
  idle:      "Ready to record",
  countdown: "Get ready…",
  recording: "Recording in progress…",
  analyzing: "Analysing your form…",
  complete:  "Analysis complete",
  error:     "Error",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrainerScreen() {
  const webviewRef = useRef<WebView>(null);

  const [webviewReady, setWebviewReady] = useState(false);
  const [status, setStatus]             = useState<SessionStatus>("idle");
  const [formLabel, setFormLabel]       = useState<string>("");
  const [aiFeedback, setAiFeedback]     = useState<string>("");
  const [frameCount, setFrameCount]     = useState(0);
  const [errorMsg, setErrorMsg]         = useState<string>("");

  // Handle all postMessage events coming from the WebView HTML
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    let msg: RNMessage;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case "ready":
        setWebviewReady(true);
        setStatus("idle");
        break;
      case "status":
        setStatus(msg.status as SessionStatus);
        if (msg.status === "recording") setFrameCount(0);
        break;
      case "frame":
        setFrameCount(msg.count);
        break;
      case "result":
        setStatus("complete");
        setFormLabel(msg.label);
        if (msg.class !== null && msg.class !== undefined) {
          setAiFeedback(CLASS_TIPS[msg.class] ?? "");
        } else {
          setAiFeedback(
            "Not enough frames were captured. Make sure your whole body is visible to the camera."
          );
        }
        break;
      case "ai_feedback":
        if (msg.message) setAiFeedback(msg.message);
        break;
      case "error":
        setStatus("error");
        setErrorMsg(msg.message);
        break;
    }
  }, []);

  // Trigger recording from the RN side via injected JS
  const handleStartRecording = useCallback(() => {
    webviewRef.current?.injectJavaScript("window.rnStartRecording(); true;");
  }, []);

  const handleStopRecording = useCallback(() => {
    webviewRef.current?.injectJavaScript("window.rnStopRecording(); true;");
  }, []);

  const isActive = status === "countdown" || status === "recording";

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ThemedView style={styles.wrapper}>

        {/* Title */}
        <ThemedText type="title" style={styles.title}>
          AI Trainer
        </ThemedText>

        {/* WebView — Metro bundles the HTML file via require() */}
        <View style={styles.webviewContainer}>
          <WebView
            ref={webviewRef}
            source={require("../assets/trainer-webview.html")}
            style={styles.webview}
            onMessage={handleMessage}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
            mixedContentMode="always"
            onError={(e) => {
              setStatus("error");
              setErrorMsg(e.nativeEvent.description);
            }}
          />

          {/* Loading overlay until MediaPipe signals it's ready */}
          {!webviewReady && (
            <View style={styles.webviewOverlay}>
              <ActivityIndicator size="large" color={Colors.dark.accent} />
              <ThemedText style={styles.loadingText}>
                Initialising MediaPipe…
              </ThemedText>
            </View>
          )}

          {/* Live frame counter badge while recording */}
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
              status === "idle"      && styles.dotIdle,
              status === "countdown" && styles.dotCountdown,
              status === "recording" && styles.dotRecording,
              status === "analyzing" && styles.dotAnalyzing,
              status === "complete"  && styles.dotComplete,
              status === "error"     && styles.dotError,
            ]}
          />
          <ThemedText style={styles.statusLabel}>
            {STATUS_LABELS[status]}
          </ThemedText>
        </View>

        {/* Record / Stop button — shown once the WebView is ready */}
        {webviewReady && (
          <Pressable
            style={[
              styles.recordButton,
              isActive && styles.recordButtonActive,
            ]}
            onPress={isActive ? handleStopRecording : handleStartRecording}
            disabled={status === "analyzing"}
          >
            <ThemedText style={styles.recordButtonText}>
              {status === "countdown"
                ? "⏳ Get ready…"
                : status === "recording"
                ? "■ Stop Recording"
                : "▶ Start Recording"}
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
                Position your whole body in frame. Keep your elbows at ~45°
                and maintain a straight line from head to heels.
              </ThemedText>
            </ThemedView>
          )}

          {status === "recording" && (
            <ThemedView style={styles.tipCard}>
              <ThemedText style={styles.tipTitle}>Recording…</ThemedText>
              <ThemedText style={styles.tipText}>
                {frameCount} frames captured so far. Recording stops
                automatically after 15 seconds, or press Stop early.
              </ThemedText>
            </ThemedView>
          )}

          {status === "analyzing" && (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color={Colors.dark.accent} />
              <ThemedText style={styles.analyzingText}>
                Sending {frameCount} frames to Flask…
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

  // ── WebView ────────────────────────────────────────────────────────────
  webviewContainer: {
    height: 280,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.dark.accent,
    marginBottom: Spacing.three,
    backgroundColor: Colors.dark.backgroundElement,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  webviewOverlay: {
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

  // ── Status row ──────────────────────────────────────────────────────────
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
  dotIdle:      { backgroundColor: Colors.dark.textSecondary },
  dotCountdown: { backgroundColor: "#f39c12" },
  dotRecording: { backgroundColor: "#e74c3c" },
  dotAnalyzing: { backgroundColor: "#f39c12" },
  dotComplete:  { backgroundColor: "#27ae60" },
  dotError:     { backgroundColor: "#e74c3c" },
  statusLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },

  // ── Record button ───────────────────────────────────────────────────────
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

  // ── Feedback panel ──────────────────────────────────────────────────────
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
  resultCardBad:  { backgroundColor: "#4a1a1a" },
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
