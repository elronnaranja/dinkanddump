import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

// TODO(phase-3): match detail / celebration screen, link into conversation.
export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>It&apos;s a match!</Text>
      <Text style={styles.body}>TODO: match detail for {matchId}.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#666" },
});
