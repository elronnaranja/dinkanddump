import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

// TODO(phase-3): real chat UI powered by useConversation.
export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversation</Text>
      <Text style={styles.body}>TODO: chat UI for conversation {conversationId}.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#666" },
});
