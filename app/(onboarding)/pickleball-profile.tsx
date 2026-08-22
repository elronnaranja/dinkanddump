import { View, Text, StyleSheet } from "react-native";

// TODO(phase-3): form for skill level, DUPR rating, game/play preference,
// dominant hand, playing frequency, years playing, favorite shot, play style.
export default function PickleballProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your pickleball profile</Text>
      <Text style={styles.body}>TODO: skill level, DUPR, preferences form.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#666" },
});
