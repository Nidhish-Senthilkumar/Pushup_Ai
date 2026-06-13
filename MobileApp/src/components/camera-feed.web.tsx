import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";

interface CameraFeedProps {
  isRecording: boolean;
  onCameraReady?: () => void;
}

export function CameraFeed({ isRecording, onCameraReady }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCameraAccess, setHasCameraAccess] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsLoading(false);
          onCameraReady?.();
        }
      } catch (err) {
        // Don't block on permission errors - show placeholder instead
        // Recording still works without camera access
        setHasCameraAccess(false);
        setIsLoading(false);
        console.error("Camera access error:", err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onCameraReady]);

  if (!hasCameraAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderContent}>
          <ThemedText style={styles.cameraIconText}>📷</ThemedText>
          <ThemedText style={styles.placeholderText}>
            Camera access needed
          </ThemedText>
          <ThemedText style={styles.placeholderSubtext}>
            Check browser permissions to enable camera
          </ThemedText>
          <ThemedText style={styles.recordingStillWorks}>
            ✓ Recording works without camera access
          </ThemedText>
        </View>
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <ThemedText style={styles.recordingText}>REC</ThemedText>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
          <ThemedText style={styles.loadingText}>Loading camera...</ThemedText>
        </View>
      )}
      <video
        ref={videoRef}
        style={styles.webVideo}
        autoPlay
        playsInline
        muted
      />
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <ThemedText style={styles.recordingText}>REC</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
  },
  webVideo: {
    flex: 1,
    width: "100%",
    objectFit: "cover",
  } as any,
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.backgroundElement,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    marginTop: 16,
  },
  errorText: {
    color: "#e74c3c",
    textAlign: "center",
    paddingHorizontal: 24,
    fontSize: 14,
  },
  placeholderContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 12,
  },
  cameraIconText: {
    fontSize: 48,
    marginBottom: 8,
  },
  placeholderText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600",
  },
  placeholderSubtext: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  recordingStillWorks: {
    color: Colors.dark.accent,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  recordingIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(231, 76, 60, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
    zIndex: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  recordingText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
});
