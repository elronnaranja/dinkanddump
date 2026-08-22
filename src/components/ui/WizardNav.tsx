import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";

interface WizardNavProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
}

export function WizardNav({
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled,
  loading,
  onSkip,
  skipLabel = "Skip",
}: WizardNavProps) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable style={styles.backButton} onPress={onBack} disabled={loading}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : (
        <View style={styles.backButton} />
      )}

      <View style={styles.rightGroup}>
        {onSkip ? (
          <Pressable onPress={onSkip} disabled={loading} style={styles.skipButton}>
            <Text style={styles.skipText}>{skipLabel}</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.nextButton, (nextDisabled || loading) && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={nextDisabled || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextText}>{nextLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
  },
  backButton: { paddingVertical: 12, paddingHorizontal: 8, minWidth: 60 },
  backText: { color: "#666", fontSize: 16 },
  rightGroup: { flexDirection: "row", alignItems: "center", gap: 16 },
  skipButton: { paddingVertical: 12, paddingHorizontal: 8 },
  skipText: { color: "#666", fontSize: 16 },
  nextButton: {
    backgroundColor: "#1a7f37",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    minWidth: 100,
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
