import { forwardRef, useImperativeHandle } from "react";
import { Dimensions, StyleSheet, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { DiscoveryCandidate } from "../../types/domain";
import type { ProfilePhotoWithUrl } from "../../hooks/useProfileMedia";
import { DiscoveryCard } from "./DiscoveryCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const VELOCITY_THRESHOLD = 900;
const FLY_OUT_DISTANCE = SCREEN_WIDTH * 1.4;

export type SwipeDirection = "left" | "right";

export interface SwipeableCardHandle {
  swipeLeft: () => void;
  swipeRight: () => void;
}

interface SwipeableCardProps {
  candidate: DiscoveryCandidate;
  photos: ProfilePhotoWithUrl[];
  hasVideo: boolean;
  isTop: boolean;
  stackIndex: number; // 0 = top card, 1 = first peek card behind it, etc.
  onSwiped: (direction: SwipeDirection) => void;
  onOpenVideo: () => void;
  onOpenInfo: () => void;
}

/**
 * Gesture + animation shell around DiscoveryCard's presentation. Both the
 * drag gesture and the explicit DUMP/DINK buttons (via the exposed
 * imperative handle) commit through the same fly-off animation, so the
 * visual language is identical regardless of how the action was triggered.
 *
 * The pan gesture uses activeOffsetX so it only "steals" the touch once the
 * finger has moved a few pixels horizontally — short taps fall through
 * untouched to the plain Pressables DiscoveryCard renders for photo
 * tap-zones and the info/video badges, without needing nested gesture
 * detectors.
 */
export const SwipeableCard = forwardRef<SwipeableCardHandle, SwipeableCardProps>(
  function SwipeableCard(
    { candidate, photos, hasVideo, isTop, stackIndex, onSwiped, onOpenVideo, onOpenInfo },
    ref
  ) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    function commit(direction: SwipeDirection) {
      const toX = direction === "right" ? FLY_OUT_DISTANCE : -FLY_OUT_DISTANCE;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      translateX.value = withTiming(toX, { duration: 240 }, (finished) => {
        if (finished) runOnJS(onSwiped)(direction);
      });
    }

    useImperativeHandle(ref, () => ({
      swipeLeft: () => commit("left"),
      swipeRight: () => commit("right"),
    }));

    const pan = Gesture.Pan()
      .enabled(isTop)
      .activeOffsetX([-15, 15])
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY * 0.25;
      })
      .onEnd((e) => {
        const passedDistance = Math.abs(e.translationX) > SWIPE_THRESHOLD;
        const passedVelocity = Math.abs(e.velocityX) > VELOCITY_THRESHOLD;
        if (passedDistance || passedVelocity) {
          const direction: SwipeDirection = e.translationX > 0 ? "right" : "left";
          const toX = direction === "right" ? FLY_OUT_DISTANCE : -FLY_OUT_DISTANCE;
          translateX.value = withTiming(toX, { duration: 220 }, (finished) => {
            if (finished) runOnJS(onSwiped)(direction);
          });
        } else {
          translateX.value = withSpring(0, { damping: 16 });
          translateY.value = withSpring(0, { damping: 16 });
        }
      });

    const cardStyle = useAnimatedStyle(() => {
      const rotate = interpolate(
        translateX.value,
        [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        [-10, 0, 10],
        Extrapolation.CLAMP
      );
      // Peek cards behind the top card sit slightly scaled-down and offset
      // for a subtle stacked-deck depth effect.
      const restScale = 1 - stackIndex * 0.05;
      const restTranslateY = stackIndex * 10;
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value + (isTop ? 0 : restTranslateY) },
          { rotate: `${rotate}deg` },
          { scale: isTop ? 1 : restScale },
        ],
      };
    });

    const dinkStampStyle = useAnimatedStyle(() => ({
      opacity: interpolate(translateX.value, [20, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
    }));
    const dumpStampStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [-SWIPE_THRESHOLD, -20],
        [1, 0],
        Extrapolation.CLAMP
      ),
    }));

    return (
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.cardWrap, cardStyle]}>
          <DiscoveryCard
            candidate={candidate}
            photos={photos}
            hasVideo={hasVideo}
            interactive={isTop}
            onOpenVideo={onOpenVideo}
            onOpenInfo={onOpenInfo}
          />

          {isTop && (
            <>
              <Animated.View style={[styles.stamp, styles.dinkStamp, dinkStampStyle]}>
                <Text style={[styles.stampText, styles.dinkStampText]}>DINK!</Text>
              </Animated.View>
              <Animated.View style={[styles.stamp, styles.dumpStamp, dumpStampStyle]}>
                <Text style={[styles.stampText, styles.dumpStampText]}>DUMP</Text>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </GestureDetector>
    );
  }
);

const styles = StyleSheet.create({
  cardWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  stamp: {
    position: "absolute",
    top: 48,
    borderWidth: 4,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  dinkStamp: { left: 24, borderColor: "#1a7f37", transform: [{ rotate: "-16deg" }] },
  dumpStamp: { right: 24, borderColor: "#e2572b", transform: [{ rotate: "16deg" }] },
  stampText: { fontSize: 30, fontWeight: "900", letterSpacing: 1 },
  dinkStampText: { color: "#1a7f37" },
  dumpStampText: { color: "#e2572b" },
});
