import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const CARD_WIDTH = 160;
const CARD_HEIGHT = 200;
const SWING = 90;

interface SwipeTutorialOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * First-launch only overlay teaching the core gesture: swipe right to Dink,
 * swipe left to Dump. Shown once (see src/services/swipeTutorial.ts for the
 * persisted "seen" flag) rather than baking a permanent hint into the
 * Discover card itself - the gesture only needs to be taught once, not
 * every time someone opens the app.
 */
export function SwipeTutorialOverlay({ visible, onDismiss }: SwipeTutorialOverlayProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    translateX.value = 0;
    translateX.value = withRepeat(
      withSequence(
        withDelay(500, withTiming(SWING, { duration: 650, easing: Easing.out(Easing.quad) })),
        withDelay(450, withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) })),
        withDelay(300, withTiming(-SWING, { duration: 650, easing: Easing.out(Easing.quad) })),
        withDelay(450, withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) }))
      ),
      -1
    );
  }, [visible, translateX]);

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SWING, 0, SWING],
      [-14, 0, 14],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateX: translateX.value }, { rotate: `${rotate}deg` }] };
  });

  const dinkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [10, SWING * 0.6], [0, 1], Extrapolation.CLAMP),
  }));
  const dumpStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWING * 0.6, -10], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Text style={styles.title}>Meet Dump and Dink</Text>
        <Text style={styles.subtitle}>
          Swipe left to pass, swipe right if you'd play with them.
        </Text>

        <View style={styles.stage}>
          <Animated.View style={[styles.dumpLabel, dumpStyle]}>
            <Text style={styles.dumpLabelText}>{"← DUMP"}</Text>
          </Animated.View>
          <Animated.View style={[styles.dinkLabel, dinkStyle]}>
            <Text style={styles.dinkLabelText}>{"DINK →"}</Text>
          </Animated.View>

          <Animated.View style={[styles.card, cardStyle]}>
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>🎾</Text>
            </View>
            <Text style={styles.cardName}>Sample, 28</Text>
          </Animated.View>
        </View>

        <Pressable style={styles.gotItButton} onPress={onDismiss}>
          <Text style={styles.gotItButtonText}>Got it</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 40,
    lineHeight: 20,
  },
  stage: {
    width: "100%",
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: "#2a2a2a",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cardAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarText: { fontSize: 28 },
  cardName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  dumpLabel: { position: "absolute", left: 4, top: "42%" },
  dinkLabel: { position: "absolute", right: 4, top: "42%" },
  dumpLabelText: { color: "#e2572b", fontSize: 18, fontWeight: "900" },
  dinkLabelText: { color: "#3ba55c", fontSize: 18, fontWeight: "900" },
  gotItButton: {
    marginTop: 44,
    backgroundColor: "#1a7f37",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  gotItButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
