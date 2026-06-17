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

  // Simulates a successful workout from the AI tracking system
  const handleWorkoutComplete = async (pushupCount, pointsEarned) => {
    const newSession = {
      id: Date.now().toString(), // Unique ID for each workout item
      date: new Date().toLocaleDateString(),
      count: pushupCount,
      points: pointsEarned,
    };

    const updatedList = await saveWorkoutToFile(newSession, history);
    setHistory(updatedList); 
    setFileRawText(JSON.stringify(updatedList, null, 2)); // Update raw viewer
    Alert.alert("Workout Saved!", `Recorded ${pushupCount} pushups.`);
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
          <ThemedText style={styles.buttonText}>+ Simulate AI Workout (25 Reps)</ThemedText>
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
              <TouchableOpacity 
                key={session.id || index} 
                onLongPress={() => handleDeleteItem(session.id)} 
                delayLongPress={600} 
                style={[
                  styles.historyItem,
                  index !== history.length - 1 && styles.itemBorder
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
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.background,
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