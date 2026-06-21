import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { CameraView, Camera } from "expo-camera";
import Svg, { Circle } from "react-native-svg";

interface CameraFeedProps {
  isRecording: boolean;
  onCameraReady?: () => void;
  onDataCaptured?: (framesArray: any[]) => void;
}

export function CameraFeed({ isRecording, onCameraReady, onDataCaptured }: CameraFeedProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [detectedLandmarks, setDetectedLandmarks] = useState<any[]>([]);
  const frameDataLog = useRef<any[]>([]);

  // Request permissions immediately when the component loads
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // Watch recording state changes from parent component
  useEffect(() => {
    if (!isRecording && frameDataLog.current.length > 0) {
      if (onDataCaptured) {
        onDataCaptured(frameDataLog.current);
      }
      frameDataLog.current = [];
    }
  }, [isRecording]);

  const handleManualRequest = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
  };

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.text}>Camera access is required for AI tracking.</Text>
        <TouchableOpacity style={styles.button} onPress={handleManualRequest}>
          <Text style={styles.btnText}>🔓 Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing="front"
        onLayout={() => {
          if (onCameraReady) onCameraReady();
        }}
      >
        <Svg style={StyleSheet.absoluteFill}>
          {detectedLandmarks.map((lm, index) => (
            <Circle key={index} cx={`${lm.x * 100}%`} cy={`${lm.y * 100}%`} r="6" fill="#00adb5" />
          ))}
        </Svg>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", borderRadius: 12, overflow: "hidden" },
  permissionContainer: { flex: 1, backgroundColor: "#1c1c1c", justifyContent: "center", alignItems: "center", padding: 20 },
  camera: { flex: 1 },
  text: { color: "#9BA1A6", textAlign: "center", marginBottom: 20, fontSize: 14 },
  button: { backgroundColor: "#3498db", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, alignSelf: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});