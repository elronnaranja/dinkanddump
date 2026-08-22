import { View, Text, StyleSheet } from "react-native";

// TODO(phase-3): image picker + upload up to 5 photos via storage service,
// insert profile_photos rows with position 0-4.
export default function PhotosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add photos</Text>
      <Text style={styles.body}>TODO: photo picker/uploader (up to 5).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#666" },
});
