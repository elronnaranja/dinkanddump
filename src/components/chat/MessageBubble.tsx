import { StyleSheet, Text, View } from "react-native";
import type { ChatMessage } from "../../types/domain";
import { formatClockTime } from "../../utils/time";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

/** A single chat bubble, right-aligned/green for the current user's own
 * messages and left-aligned/gray for the other participant's, each with a
 * small clock-time label underneath. No read-receipt UI — spec calls for
 * clarity/speed over flourish here. */
export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>
          {message.content}
        </Text>
      </View>
      <Text style={styles.time}>{formatClockTime(message.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 4, maxWidth: "78%" },
  rowOwn: { alignSelf: "flex-end", alignItems: "flex-end" },
  rowOther: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOwn: { backgroundColor: "#1a7f37", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#f0f0f0", borderBottomLeftRadius: 4 },
  text: { fontSize: 15, lineHeight: 20 },
  textOwn: { color: "#fff" },
  textOther: { color: "#222" },
  time: { fontSize: 11, color: "#999", marginTop: 2, marginHorizontal: 4 },
});
