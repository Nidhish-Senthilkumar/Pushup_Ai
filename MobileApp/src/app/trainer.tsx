import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";

export default function TrainerScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState("Record A Pushup!");
  const [status, setStatus] = useState("waiting");

  const handleStartRecording = () => {
    setIsRecording(true);
    setStatus("recording");
    setFeedback("Recording your pushup...");

    // Simulate recording for demo
    setTimeout(() => {
      setIsRecording(false);
      setStatus("analyzing");
      setFeedback("Analyzing your form...");

      setTimeout(() => {
        setStatus("complete");
        setFeedback(
          "Great pushup! Your form was excellent. Keep your elbows close to your body and maintain a straight line from head to heels.",
        );
      }, 1500);
    }, 3000);
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
          <ThemedView style={styles.cameraBox}>
            <ThemedText style={styles.cameraPlaceholder}>
              📹 Camera Feed
            </ThemedText>
            <ThemedText style={styles.cameraSubtext}>
              (Live pose detection would display here)
            </ThemedText>
          </ThemedView>

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
                <ThemedText style={styles.statValue}>92%</ThemedText>
                <ThemedText style={styles.statLabel}>Form Score</ThemedText>
              </View>
              <View style={styles.statCard}>
                <ThemedText style={styles.statValue}>2.1s</ThemedText>
                <ThemedText style={styles.statLabel}>Rep Duration</ThemedText>
              </View>
            </View>
          )}
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
    marginBottom: Spacing.four,
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
