import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

interface EmptyQueueStateProps {
  onRefresh: () => void;
  refreshing?: boolean;
}

/**
 * Shown once the discovery queue is genuinely exhausted (the RPC returned
 * zero candidates within the current filters). There's no discovery
 * preferences screen yet to route to (later phase), so "increase distance"
 * is a real, tappable affordance that's honest about not being wired up
 * yet, rather than a dead link.
 */
export function EmptyQueueState({ onRefresh, refreshing }: EmptyQueueStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>No more players around here.</Text>
      <Text style={styles.body}>
        You've seen everyone nearby who matches your current filters. Check back later, or widen
        your search.
      </Text>

      <Pressable
        style={styles.secondaryButton}
        onPress={() =>
          // TODO(phase-6 or later): route to a discovery preferences screen
          // once one exists, letting the user raise p_max_distance_km /
          // widen skill range for get_discovery_candidates.
          Alert.alert(
            "Coming soon",
            "Adjustable discovery distance and skill range are coming in a future update."
          )
        }
      >
        <Text style={styles.secondaryButtonText}>Increase discovery distance</Text>
      </Pressable>

      <Pressable style={styles.primaryButton} onPress={onRefresh} disabled={refreshing}>
        <Text style={styles.primaryButtonText}>{refreshing ? "Checking..." : "Check again"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  body: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20, marginBottom: 28 },
  primaryButton: {
    backgroundColor: "#1a7f37",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 12,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  secondaryButtonText: { color: "#333", fontWeight: "600", fontSize: 15 },
});
