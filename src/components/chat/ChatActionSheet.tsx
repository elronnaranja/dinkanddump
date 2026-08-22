import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface ChatActionSheetProps {
  visible: boolean;
  otherFirstName: string;
  onClose: () => void;
  onViewProfile: () => void;
  onUnmatch: () => void;
  onBlock: () => void;
  onReport: () => void;
}

/**
 * The chat screen's header "..." menu: View profile / Unmatch / Report /
 * Block, plus Cancel. Plain RN Modal bottom sheet, matching the pattern
 * MoreInfoSheet already established (no bottom-sheet library in the repo).
 */
export function ChatActionSheet({
  visible,
  otherFirstName,
  onClose,
  onViewProfile,
  onUnmatch,
  onBlock,
  onReport,
}: ChatActionSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{otherFirstName}</Text>

        <Pressable style={styles.option} onPress={onViewProfile}>
          <Text style={styles.optionText}>View profile</Text>
        </Pressable>
        <Pressable style={styles.option} onPress={onUnmatch}>
          <Text style={styles.optionText}>Unmatch</Text>
        </Pressable>
        <Pressable style={styles.option} onPress={onReport}>
          <Text style={styles.optionText}>Report</Text>
        </Pressable>
        <Pressable style={styles.option} onPress={onBlock}>
          <Text style={[styles.optionText, styles.destructiveText]}>Block</Text>
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginBottom: 12,
  },
  title: { fontSize: 13, fontWeight: "700", color: "#999", textAlign: "center", marginBottom: 8 },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  optionText: { fontSize: 16, color: "#222", textAlign: "center" },
  destructiveText: { color: "#c0392b" },
  cancelButton: {
    marginHorizontal: 24,
    marginTop: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: { color: "#333", fontWeight: "700", fontSize: 15 },
});
