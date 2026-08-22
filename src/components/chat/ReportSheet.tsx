import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { REPORT_REASONS } from "../../constants/reportReasons";

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

/**
 * Reason-picker bottom sheet for profile-level reports (spec section 18).
 * Submission errors are shown inline rather than closing the sheet, so the
 * user can retry without re-picking a reason.
 */
export function ReportSheet({ visible, onClose, onSubmit }: ReportSheetProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setSelected(null);
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(selected);
      setSelected(null);
    } catch {
      setError("Couldn't submit your report. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Report this player</Text>
        <Text style={styles.subtitle}>What's going on?</Text>

        {REPORT_REASONS.map((reason) => {
          const isSelected = selected === reason.value;
          return (
            <Pressable
              key={reason.value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => setSelected(reason.value)}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {reason.label}
              </Text>
            </Pressable>
          );
        })}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.submitButton, (!selected || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!selected || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit report</Text>
          )}
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={handleClose}>
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
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#999", textAlign: "center", marginTop: 4, marginBottom: 14 },
  option: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  optionSelected: { borderColor: "#1a7f37", backgroundColor: "#e8f5e9" },
  optionText: { fontSize: 15, color: "#333" },
  optionTextSelected: { color: "#1a7f37", fontWeight: "600" },
  errorText: { color: "#c0392b", fontSize: 13, textAlign: "center", marginTop: 4 },
  submitButton: {
    marginTop: 12,
    backgroundColor: "#c0392b",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelButton: {
    marginTop: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: { color: "#333", fontWeight: "700", fontSize: 15 },
});
