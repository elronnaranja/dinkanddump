import { View, Text, StyleSheet } from "react-native";

interface StepProgressBarProps {
  currentStep: number; // 1-based
  totalSteps: number;
  label?: string;
}

export function StepProgressBar({ currentStep, totalSteps, label }: StepProgressBarProps) {
  const pct = Math.max(0, Math.min(1, currentStep / totalSteps));

  return (
    <View style={styles.container}>
      <View style={styles.trackRow}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i < currentStep ? styles.segmentFilled : styles.segmentEmpty,
              i > 0 && styles.segmentGap,
            ]}
          />
        ))}
      </View>
      <Text style={styles.caption}>
        Step {currentStep} of {totalSteps}
        {label ? ` · ${label}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, marginBottom: 16 },
  trackRow: { flexDirection: "row" },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  segmentGap: { marginLeft: 4 },
  segmentFilled: { backgroundColor: "#1a7f37" },
  segmentEmpty: { backgroundColor: "#e0e0e0" },
  caption: { fontSize: 12, color: "#666" },
});
