import { View, Text, StyleSheet } from "react-native";

// TODO(phase-3): build real form (first name, DOB, gender) wired to
// profiles service upsertProfile, with validation.
export default function BasicProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Basic profile</Text>
      <Text style={styles.body}>TODO: name, date of birth, gender form.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#666" },
});
