import { View, Text, StyleSheet } from "react-native";

// TODO(phase-3): edit profile form wired to profiles service updateProfile.
export default function EditProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit profile</Text>
      <Text style={styles.body}>TODO: edit profile form.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#666" },
});
