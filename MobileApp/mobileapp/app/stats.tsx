import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";
import PushupDataSave from '@/components/pushupDataSave'; // Adjust the path if needed
import { loadHistoryFromFile } from "@/storage/storage";

// ─── Derive real stats from saved history ──────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;

type SavedSession = {
  sessionNumber?: number;
  date?: string;
  count?: number;
  score?: number;
  [key: string]: any;
};

function computeStats(history: SavedSession[]) {
  if (!history.length) {
    return { totalPushups: 0, averageScore: 0, bestScore: 0, streak: 0, thisWeek: 0, thisMonth: 0 };
  }
  const now = Date.now();
  let totalPushups = 0, thisWeek = 0, thisMonth = 0;
  let scoreSum = 0, scoreCount = 0, bestScore = 0;
  const days = new Set();

  for (const s of history) {
    const count = Number(s.count) || 0;
    totalPushups += count;

    // Only count sessions that actually had reps toward the score average.
    if (count > 0) {
      const score = Number(s.score) || 0;
      scoreSum += score; scoreCount += 1; bestScore = Math.max(bestScore, score);
    }

    const t = s.date ? Date.parse(s.date) : NaN;
    if (!Number.isNaN(t)) {
      days.add(new Date(t).toDateString());
      if (now - t <= 7 * DAY) thisWeek += count;
      if (now - t <= 30 * DAY) thisMonth += count;
    }
  }

  return {
    totalPushups,
    averageScore: scoreCount ? Math.round(scoreSum / scoreCount) : 0,
    bestScore: Math.round(bestScore),
    streak: days.size,
    thisWeek,
    thisMonth,
  };
}

function computeRecent(history: SavedSession[]) {
  return history.slice(0, 5).map((s) => ({
    date: s.sessionNumber ? `Session #${s.sessionNumber} • ${s.date || ""}` : (s.date || "Unknown"),
    reps: Number(s.count) || 0,
    avgScore: Math.round(Number(s.score) || 0),
  }));
}

export default function StatsScreen() {
  const [history, setHistory] = useState<SavedSession[]>([]);

  // Reload saved sessions whenever the Stats tab gains focus.
  useFocusEffect(
    useCallback(() => {
      (async () => setHistory(await loadHistoryFromFile()))();
    }, [])
  );

  const stats = useMemo(() => computeStats(history), [history]);
  const recentSessions = useMemo(() => computeRecent(history), [history]);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView style={styles.wrapper}>
        {/* Title */}
        <ThemedText type="title" style={styles.title}>
          Performance Stats
        </ThemedText>

        {/* Key Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>
              {stats.totalPushups}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Total Pushups</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>
              {stats.averageScore}%
            </ThemedText>
            <ThemedText style={styles.statLabel}>Avg Score</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>
              {stats.bestScore}%
            </ThemedText>
            <ThemedText style={styles.statLabel}>Best Score</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{stats.streak}</ThemedText>
            <ThemedText style={styles.statLabel}>Day Streak</ThemedText>
          </View>
        </View>

        {/* Time Period Stats */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Activity Summary</ThemedText>
          <View style={styles.periodStats}>
            <View style={styles.periodItem}>
              <ThemedText style={styles.periodLabel}>This Week</ThemedText>
              <ThemedText style={styles.periodValue}>
                {stats.thisWeek} reps
              </ThemedText>
            </View>
            <View style={styles.periodItem}>
              <ThemedText style={styles.periodLabel}>This Month</ThemedText>
              <ThemedText style={styles.periodValue}>
                {stats.thisMonth} reps
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Recent Sessions */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Recent Sessions</ThemedText>
          {recentSessions.length === 0 && (
            <ThemedText style={styles.tipText}>
              No sessions yet — record a set in the AI Trainer tab and it will appear here.
            </ThemedText>
          )}
          {recentSessions.map((session, index) => (
            <View
              key={index}
              style={[
                styles.sessionItem,
                index !== recentSessions.length - 1 && styles.sessionItemBorder,
              ]}
            >
              <View style={styles.sessionLeft}>
                <ThemedText style={styles.sessionDate}>
                  {session.date}
                </ThemedText>
                <ThemedText style={styles.sessionDetails}>
                  {session.reps} reps • Score: {session.avgScore}%
                </ThemedText>
              </View>
              <View
                style={[
                  styles.sessionScore,
                  {
                    borderLeftColor:
                      session.avgScore >= 90
                        ? "#27ae60"
                        : session.avgScore >= 80
                          ? Colors.dark.accent
                          : "#e74c3c",
                  },
                ]}
              >
                <ThemedText style={styles.scoreText}>
                  {session.avgScore}%
                </ThemedText>
              </View>
            </View>
          ))}
        </ThemedView>

        {/* Tips Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            💡 Tips to Improve
          </ThemedText>
          <ThemedText style={styles.tipText}>
            • Keep your elbows at a 45° angle for better form
          </ThemedText>
          <ThemedText style={styles.tipText}>
            • Maintain a straight line from head to heels
          </ThemedText>
          <ThemedText style={styles.tipText}>
            • Lower until your chest nearly touches the ground
          </ThemedText>
        </ThemedView>
        <PushupDataSave />
      </ScrollView>
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
    paddingBottom: Spacing.four,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginBottom: Spacing.four,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  statItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: "center",
    borderTopWidth: 3,
    borderTopColor: Colors.dark.accent,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginBottom: Spacing.one,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
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
    marginBottom: Spacing.two,
  },
  periodStats: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  periodItem: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    padding: Spacing.two,
    alignItems: "center",
  },
  periodLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.one,
  },
  periodValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  sessionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.two,
  },
  sessionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.background,
  },
  sessionLeft: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.text,
    marginBottom: Spacing.half,
  },
  sessionDetails: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  sessionScore: {
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    borderLeftWidth: 3,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    marginLeft: Spacing.two,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  tipText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.two,
    lineHeight: 20,
  },
});
