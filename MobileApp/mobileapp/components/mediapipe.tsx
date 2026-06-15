import React, { useState } from "react";
import { View } from "react-native";
import { Camera } from "react-native-vision-camera-v3-pose-detection";

export default function App(props: any) {
  const [pose, setPose] = useState(null);

  return (
    <View style={{ flex: 1 }}>
      <Camera
        // optional
        options={{
          mode: "stream",
          performanceMode: "max",
        }}
        callback={(data: any) => setPose(data)}
        {...props}
      />
    </View>
  );
}
