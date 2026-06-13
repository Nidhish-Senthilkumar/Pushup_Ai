import { Platform, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedIcon } from "@/components/animated-icon";
import { HintRow } from "@/components/hint-row";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WebBadge } from "@/components/web-badge";
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
  Colors,
} from "@/constants/theme";

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero Section */}
          <ThemedView style={styles.heroSection}>
            <ThemedText type="title" style={styles.mainTitle}>
              Push-Up AI Trainer
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Perfect your form with real-time AI feedback
            </ThemedText>
          </ThemedView>

          {/* Feature Cards */}
          <ThemedView style={styles.featuresSection}>
            <FeatureCard
              icon="📹"
              title="Live Camera"
              description="Real-time pose detection using advanced computer vision"
            />
            <FeatureCard
              icon="🤖"
              title="AI Coach"
              description="Get instant feedback on your form and technique"
            />
            <FeatureCard
              icon="📊"
              title="Track Progress"
              description="Monitor your performance over time with detailed stats"
            />
          </ThemedView>

          {/* Getting Started */}
          <ThemedView type="backgroundElement" style={styles.gettingStarted}>
            <ThemedText style={styles.sectionTitle}>Get Started</ThemedText>
            <HintRow
              title="Go to AI Trainer"
              hint={
                <ThemedText type="code">Start recording pushups</ThemedText>
              }
            />
            <HintRow
              title="View Your Stats"
              hint={<ThemedText type="code">Track performance</ThemedText>}
            />
            <HintRow
              title="Improve Your Form"
              hint={
                <ThemedText type="code">Follow AI recommendations</ThemedText>
              }
            />
          </ThemedView>

          {/* Call to Action */}
          <ThemedView style={styles.ctaSection}>
            <ThemedText style={styles.ctaText}>
              Ready to improve your push-ups? Head to the AI Trainer tab to get
              started!
            </ThemedText>
          </ThemedView>

          {Platform.OS === "web" && <WebBadge />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <ThemedView style={styles.featureCard}>
      <ThemedText style={styles.featureIcon}>{icon}</ThemedText>
      <ThemedText style={styles.featureTitle}>{title}</ThemedText>
      <ThemedText style={styles.featureDescription}>{description}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.six,
    paddingVertical: Spacing.four,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginBottom: Spacing.two,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  featuresSection: {
    gap: Spacing.three,
    marginBottom: Spacing.six,
  },
  featureCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    padding: Spacing.four,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: Colors.dark.accent,
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: Spacing.two,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginBottom: Spacing.one,
  },
  featureDescription: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  gettingStarted: {
    borderRadius: 12,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginBottom: Spacing.three,
  },
  ctaSection: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    padding: Spacing.four,
    borderTopWidth: 2,
    borderTopColor: Colors.dark.accent,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 14,
    color: Colors.dark.text,
    textAlign: "center",
    lineHeight: 22,
  },
});
