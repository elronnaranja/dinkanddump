import { View, Text, StyleSheet } from "react-native";

// TODO(phase-3): request expo-location permissions, capture lat/lng + city/region,
// write to profiles via profiles service.
export default function LocationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location</Text>
      <Text style={styles.body}>TODO: capture location for matching radius.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#666" },
});
