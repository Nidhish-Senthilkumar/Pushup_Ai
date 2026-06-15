import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MediaPipe from "@/components/mediapipe";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { CameraFeed } from "@/components/camera-feed";
import { Colors, Spacing } from "@/constants/theme";

type RepResult = {
  id: number;
  isGood: boolean;
};

export default function TrainerScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState("Record A Pushup!");
  const [status, setStatus] = useState("waiting");
  const [repResults, setRepResults] = useState<RepResult[]>([]);
  const [accuracy, setAccuracy] = useState(0);
  const [improvementTip, setImprovementTip] = useState(
    "Keep your elbows at roughly 45° and keep your body in a straight line.",
  );

  const handleStartRecording = () => {
    setIsRecording(true);
    setStatus("recording");
    setFeedback("Recording your pushup...");

    setTimeout(() => {
      setIsRecording(false);
      setStatus("analyzing");
      setFeedback("Analyzing your form...");

      setTimeout(() => {
        const generatedResults = Array.from({ length: 6 }, (_, index) => ({
          id: index + 1,
          isGood: index !== 2 && index !== 4,
        }));
        const goodCount = generatedResults.filter((rep) => rep.isGood).length;
        const averageAccuracy = Math.round(
          (goodCount / generatedResults.length) * 100,
        );

        setRepResults(generatedResults);
        setAccuracy(averageAccuracy);
        setStatus("complete");
        setFeedback(
          `You completed ${generatedResults.length} pushups with ${averageAccuracy}% form accuracy.`,
        );
        setImprovementTip(
          averageAccuracy >= 85
            ? "Excellent form — keep your elbows close to your body and stay aligned."
            : averageAccuracy >= 65
              ? "Try to keep your hips lower and elbows tucked in for cleaner reps."
              : "Focus on a straight body line and a controlled lowering phase to improve form.",
        );
      }, 1500);
    }, 10000);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ThemedView style={styles.wrapper}>
        {/* Title */}
        <ThemedText type="title" style={styles.title}>
          AI Trainer
        </ThemedText>

        {/* Camera Section */}
        <View style={styles.cameraSection}>
          <CameraFeed isRecording={isRecording} />
          <MediaPipe />
          <View style={styles.repTrackerSection}>
            <ThemedText style={styles.repTrackerTitle}>Rep Tracker</ThemedText>
            <View style={styles.repDotsRow}>
              {repResults.length > 0 ? (
                repResults.map((rep) => (
                  <View
                    key={rep.id}
                    style={[
                      styles.repDot,
                      rep.isGood ? styles.repDotGood : styles.repDotBad,
                    ]}
                  />
                ))
              ) : (
                <ThemedText style={styles.repHintText}>
                  Start a session to see each rep here.
                </ThemedText>
              )}
            </View>
          </View>

          {/* Recording Button */}
          <Pressable
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
            onPress={handleStartRecording}
            disabled={isRecording}
          >
            <ThemedText
              style={[
                styles.recordButtonText,
                isRecording && styles.recordButtonTextActive,
              ]}
            >
              {isRecording ? "● Recording..." : "▶ Start Recording"}
            </ThemedText>
          </Pressable>
        </View>

        {/* Feedback Panel */}
        <ScrollView style={styles.feedbackPanel}>
          <ThemedText style={styles.feedbackTitle}>AI Coach</ThemedText>

          {/* Status Indicator */}
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                status === "waiting" && styles.dotWaiting,
                status === "recording" && styles.dotRecording,
                status === "analyzing" && styles.dotAnalyzing,
                status === "complete" && styles.dotComplete,
              ]}
            />
            <ThemedText style={styles.statusText}>
              {status === "waiting" && "Ready to record"}
              {status === "recording" && "Recording in progress..."}
              {status === "analyzing" && "Analyzing your form..."}
              {status === "complete" && "Analysis complete"}
            </ThemedText>
          </View>

          {/* Feedback Text */}
          <ThemedView style={styles.feedbackContent}>
            <ThemedText style={styles.feedbackText}>{feedback}</ThemedText>
          </ThemedView>

          {/* Stats Section */}
          {status === "complete" && (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <ThemedText style={styles.statValue}>{accuracy}%</ThemedText>
                <ThemedText style={styles.statLabel}>Form Accuracy</ThemedText>
              </View>
              <View style={styles.statCard}>
                <ThemedText style={styles.statValue}>
                  {repResults.length}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Pushups Logged</ThemedText>
              </View>
            </View>
          )}

          <ThemedView style={styles.tipCard}>
            <ThemedText style={styles.tipTitle}>How to improve</ThemedText>
            <ThemedText style={styles.tipText}>{improvementTip}</ThemedText>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

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
    marginBottom: Spacing.four,
    textAlign: "center",
  },
  cameraSection: {
    height: 560,
    marginBottom: Spacing.four,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.dark.accent,
  },
  cameraBox: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.three,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
    opacity: 0.8,
  },
  cameraPlaceholder: {
    fontSize: 48,
    marginBottom: Spacing.one,
  },
  cameraSubtext: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  repTrackerSection: {
    backgroundColor: Colors.dark.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.background,
  },
  repTrackerTitle: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: Spacing.one,
  },
  repDotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
    alignItems: "center",
  },
  repDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  repDotGood: {
    backgroundColor: "#27ae60",
  },
  repDotBad: {
    backgroundColor: "#e74c3c",
  },
  repHintText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  recordButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  recordButtonActive: {
    backgroundColor: "#e74c3c",
    opacity: 0.8,
  },
  recordButtonText: {
    color: Colors.dark.background,
    fontSize: 16,
    fontWeight: "700",
  },
  recordButtonTextActive: {
    color: Colors.dark.text,
  },
  feedbackPanel: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginBottom: Spacing.two,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSelected,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.two,
  },
  dotWaiting: {
    backgroundColor: Colors.dark.textSecondary,
  },
  dotRecording: {
    backgroundColor: "#e74c3c",
  },
  dotAnalyzing: {
    backgroundColor: "#f39c12",
  },
  dotComplete: {
    backgroundColor: "#27ae60",
  },
  statusText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  feedbackContent: {
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    padding: Spacing.three,
    marginVertical: Spacing.two,
  },
  tipCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
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
    lineHeight: 18,
  },
  feedbackText: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    padding: Spacing.three,
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.accent,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginBottom: Spacing.one,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
});
