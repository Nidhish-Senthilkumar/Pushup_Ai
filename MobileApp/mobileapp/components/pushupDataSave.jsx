import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert } from 'react-native';

// IMPORT storage tools from your storage file
import { loadHistoryFromFile, saveWorkoutToFile, clearHistoryFile } from '../storage/storage';

// IMPORT theme assets
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";

export default function PushupDataSave() {
  const [history, setHistory] = useState([]);
  const [fileRawText, setFileRawText] = useState('No data loaded yet.');

  // Automatically load the data from the phone's storage when the app opens
  useEffect(() => {
    async function initLoad() {
      const savedData = await loadHistoryFromFile();
      const verifiedData = savedData || [];
      setHistory(verifiedData);
      setFileRawText(JSON.stringify(verifiedData, null, 2));
    }
    initLoad();
  }, []);

  // Simulates a standard successful workout from the AI tracking system
  const handleWorkoutComplete = async (pushupCount, pointsEarned) => {
    const newSession = {
      id: Date.now().toString(), // Unique ID for each workout item
      date: new Date().toLocaleDateString(),
      count: pushupCount,
      points: pointsEarned,
      reps: null // Fallback placeholder for standard quick sessions
    };

    const updatedList = await saveWorkoutToFile(newSession, history);
    setHistory(updatedList); 
    setFileRawText(JSON.stringify(updatedList, null, 2)); // Update raw viewer
    Alert.alert("Workout Saved!", `Recorded ${pushupCount} pushups.`);
  };

  // Advanced Stream Simulator: Translates model training frame sequences into Gemini Payloads
  const handleSimulateModelWorkout = async () => {
    // These metrics isolate the key form boundary nodes present within your raw array sequences
    const parsedReps = [
      { repNumber: 1, lowestElbowAngle: 63.9, highestElbowAngle: 179.5 },
      { repNumber: 2, lowestElbowAngle: 51.7, highestElbowAngle: 179.7 },
      { repNumber: 3, lowestElbowAngle: 51.9, highestElbowAngle: 179.9 }
    ];

    const newSession = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      count: parsedReps.length,
      points: parsedReps.length * 100,
      reps: parsedReps,
      // Target text property populated directly by your teammate's Gemini API output block
      geminiFeedback: "Excellent execution throughout this set! Your depth surpassed the standard 90° requirement comfortably, averaging around 55° at your lowest points. Great extension control on the lockouts."
    };

    const updatedList = await saveWorkoutToFile(newSession, history);
    setHistory(updatedList); 
    setFileRawText(JSON.stringify(updatedList, null, 2));
    Alert.alert("AI Set Processed", "Model frame analytics converted to history logs!");
  };

  // Deletes just ONE specific workout line item when pressed and held
  const handleDeleteItem = async (itemId) => {
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this specific workout from your history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const updatedList = history.filter(item => item && item.id !== itemId);
            setHistory(updatedList);
            setFileRawText(JSON.stringify(updatedList, null, 2)); // Update raw viewer
            
            // Overwrites the file on the phone's storage with the newly shrunk list
            await saveWorkoutToFile(null, updatedList); 
          } 
        }
      ]
    );
  };

  // Safety confirmation trigger for clearing the ENTIRE file
  const handleClearWithWarning = () => {
    Alert.alert(
      "Warning",
      "Are you sure you want to permanently clear your entire workout history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Everything", 
          style: "destructive", 
          onPress: async () => {
            const emptyList = await clearHistoryFile();
            setHistory(emptyList);
            setFileRawText('The file has been cleared.');
          } 
        }
      ]
    );
  };

  return (
    <View style={{ marginBottom: Spacing.four }}>
      {/* DEVELOPER SIMULATOR CARD */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Developer Tools</ThemedText>
        
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => handleWorkoutComplete(25, 250)}
        >
          <ThemedText style={styles.buttonText}>+ Simulate Standard Workout (25 Reps)</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.primaryButton, { marginTop: Spacing.one }]} 
          onPress={handleSimulateModelWorkout}
        >
          <ThemedText style={styles.buttonText}>⚡ Process AI Model Training Metrics</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.dangerButton} onPress={handleClearWithWarning}>
          <ThemedText style={styles.dangerButtonText}>⚠️ Reset Whole History File</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* HISTORICAL RECORDS DISPLAY */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Saved Workout History</ThemedText>
        
        {history.length === 0 ? (
          <ThemedText style={styles.emptyText}>No saved workouts found on this device.</ThemedText>
        ) : (
          history.map((session, index) => {
            // 🛡️ CRITICAL CRASH GUARD: If an item is blank/null, skip it safely
            if (!session) return null;

            return (
              <ThemedView key={session.id || index} style={styles.workoutCardWrapper}>
                <TouchableOpacity 
                  onLongPress={() => handleDeleteItem(session.id)} 
                  delayLongPress={600} 
                  style={[
                    styles.historyItem,
                    session.reps && styles.itemBorder
                  ]}
                >
                  <View style={styles.historyLeft}>
                    <ThemedText style={styles.historyDate}>{session.date || "Unknown Date"}</ThemedText>
                    <ThemedText style={styles.historyDetails}>
                      {session.count ?? 0} reps • <ThemedText style={styles.holdText}>Hold to delete</ThemedText>
                    </ThemedText>
                  </View>
                  <View style={styles.scoreBadge}>
                    <ThemedText style={styles.scoreText}>+{session.points ?? 0} PTS</ThemedText>
                  </View>
                </TouchableOpacity>

                {/* DYNAMIC METRIC GENERATION SECTION */}
                {session.reps && (
                  <View style={styles.repContainer}>
                    {session.reps.map((rep, rIdx) => {
                      const incompleteDepth = rep.lowestElbowAngle > 95;
                      const incompleteExtension = rep.highestElbowAngle < 165;

                      return (
                        <View key={rIdx} style={styles.repRow}>
                          <ThemedText style={styles.repNumberText}>Rep {rep.repNumber}</ThemedText>
                          <View style={styles.angleStats}>
                            <ThemedText style={[styles.angleLabel, incompleteDepth && styles.badAngle]}>
                              ⬇️ Drop: {Math.round(rep.lowestElbowAngle)}°
                            </ThemedText>
                            <ThemedText style={[styles.angleLabel, incompleteExtension && styles.badAngle]}>
                              ⬆️ Peak: {Math.round(rep.highestElbowAngle)}°
                            </ThemedText>
                          </View>
                        </View>
                      );
                    })}

                    {/* GEMINI TARGETED COACHING WRAPPER */}
                    <View style={styles.geminiBox}>
                      <ThemedText style={styles.geminiTitle}>✨ AI Insights (Gemini Advice)</ThemedText>
                      <ThemedText style={styles.geminiText}>
                        {session.geminiFeedback || '"Formatting data arrays for telemetry feedback evaluation..."'}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </ThemedView>
            );
          })
        )}
      </ThemedView>

      {/* RAW TEXT FILE INSPECTOR */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Raw File Inspector</ThemedText>
        <ScrollView style={styles.displayBox} nestedScrollEnabled={true}>
          <ThemedText style={styles.outputText}>{fileRawText}</ThemedText>
        </ScrollView>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginBottom: Spacing.three,
  },
  primaryButton: {
    backgroundColor: Colors.dark.background,
    borderColor: Colors.dark.accent,
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.accent,
  },
  dangerButton: {
    paddingTop: Spacing.two,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  workoutCardWrapper: {
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    marginBottom: Spacing.two,
    borderColor: '#222',
    borderWidth: 1,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundElement,
    marginBottom: Spacing.one,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  historyDetails: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  holdText: {
    color: '#e74c3c',
    fontSize: 11,
  },
  scoreBadge: {
    backgroundColor: '#27ae6022',
    borderColor: '#27ae60',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#27ae60',
  },
  repContainer: {
    paddingVertical: 4,
  },
  repRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  repNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  angleStats: {
    flexDirection: 'row',
  },
  angleLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginLeft: Spacing.three,
  },
  badAngle: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  geminiBox: {
    backgroundColor: Colors.dark.backgroundElement,
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginTop: Spacing.two,
  },
  geminiTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00adb5',
    marginBottom: 4,
  },
  geminiText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#ececec',
    lineHeight: 16,
  },
  displayBox: {
    backgroundColor: Colors.dark.background,
    padding: 10,
    borderRadius: 8,
    maxHeight: 180,
  },
  outputText: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: Colors.dark.text,
  },
});