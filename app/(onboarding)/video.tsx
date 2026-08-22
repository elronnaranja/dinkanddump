import { View, Text, StyleSheet } from "react-native";

// TODO(phase-3): video picker/recorder + upload via storage service,
// insert profile_videos row, mark onboarding_completed=true and route to (tabs).
export default function VideoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add a highlight video</Text>
      <Text style={styles.body}>TODO: video picker/recorder + upload.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#666" },
});
