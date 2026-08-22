import { Pressable, StyleSheet, Text, View } from "react-native";

interface ActionButtonsProps {
  onDump: () => void;
  onDink: () => void;
  disabled?: boolean;
}

/**
 * The explicit tap-to-act controls (as opposed to the swipe gesture on the
 * card itself). Dump = a warm "pickleball orange", Dink = the app's
 * established brand green (matches the accent used across profile/edit
 * screens), so the color language stays consistent between "act on a card"
 * and "look at your own profile". Labels are set directly in the buttons
 * (rather than icon glyphs) to keep this screen free of any font/glyph
 * rendering ambiguity across platforms.
 */
export function ActionButtons({ onDump, onDink, disabled }: ActionButtonsProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onDump}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          styles.dumpButton,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Dump this player"
      >
        <Text style={[styles.buttonText, styles.dumpText]}>DUMP</Text>
      </Pressable>
      <Pressable
        onPress={onDink}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          styles.dinkButton,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Dink this player"
      >
        <Text style={[styles.buttonText, styles.dinkText]}>DINK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
    paddingVertical: 16,
  },
  button: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  dumpButton: { backgroundColor: "#fff", borderWidth: 2.5, borderColor: "#e2572b" },
  dinkButton: { backgroundColor: "#fff", borderWidth: 2.5, borderColor: "#1a7f37" },
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
  disabled: { opacity: 0.4 },
  buttonText: { fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  dumpText: { color: "#e2572b" },
  dinkText: { color: "#1a7f37" },
});
