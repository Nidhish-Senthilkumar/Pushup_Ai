import * as FileSystem from 'expo-file-system/legacy';

// path of file
const fileUri = FileSystem.documentDirectory + 'pushup_history.json';

/**
 * Saves a new push-up session to the file.
 * @param {Object} newSession - e.g., { id: '1', date: '6/16/2026', count: 20, points: 100 }
 * @param {Array} existingHistory - The current history array from your app state
 */
export const saveWorkoutToFile = async (newSession, existingHistory) => {
  try {
    // Put the newest workout at the top of the list
    const updatedHistory = [newSession, ...existingHistory];
    
    // Turn the array into text and save it
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(updatedHistory));
    
    return updatedHistory; // Returns the new list so your UI can update
  } catch (error) {
    console.error("Error writing to file:", error);
    throw error;
  }
};


export const loadHistoryFromFile = async () => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    
    if (fileInfo.exists) {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      return JSON.parse(fileContent); // Convert text back into a JS array
    }
    
    return []; // Return empty array if file doesn't exist yet
  } catch (error) {
    console.error("Error reading from file:", error);
    return [];
  }
};


export const clearHistoryFile = async () => {
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    return [];
  } catch (error) {
    console.error("Error deleting file:", error);
    return [];
  }
};