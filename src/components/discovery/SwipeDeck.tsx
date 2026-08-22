import { forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import type { DiscoveryCandidate } from "../../types/domain";
import type { ProfilePhotoWithUrl } from "../../hooks/useProfileMedia";
import { SwipeableCard, type SwipeableCardHandle, type SwipeDirection } from "./SwipeableCard";

const MAX_VISIBLE_CARDS = 3;

interface SwipeDeckProps {
  candidates: DiscoveryCandidate[];
  /** Full photo/video data, resolved only for the top-of-stack candidate. */
  topPhotos: ProfilePhotoWithUrl[];
  topHasVideo: boolean;
  onSwiped: (direction: SwipeDirection, candidate: DiscoveryCandidate) => void;
  onOpenVideo: () => void;
  onOpenInfo: () => void;
}

/**
 * Renders a small stack of the next few candidates (top card interactive,
 * one or two peeking behind for depth) rather than the whole queue, so we
 * don't mount gesture handlers or images for cards the user hasn't reached.
 */
export const SwipeDeck = forwardRef<SwipeableCardHandle, SwipeDeckProps>(function SwipeDeck(
  { candidates, topPhotos, topHasVideo, onSwiped, onOpenVideo, onOpenInfo },
  topCardRef
) {
  const visible = candidates.slice(0, MAX_VISIBLE_CARDS);

  return (
    <View style={styles.container}>
      {/* Reversed so the first candidate renders last (on top) in z-order. */}
      {visible
        .map((candidate, index) => (
          <SwipeableCard
            key={candidate.id}
            ref={index === 0 ? topCardRef : undefined}
            candidate={candidate}
            photos={index === 0 ? topPhotos : []}
            hasVideo={index === 0 && topHasVideo}
            isTop={index === 0}
            stackIndex={index}
            onSwiped={(direction) => onSwiped(direction, candidate)}
            onOpenVideo={onOpenVideo}
            onOpenInfo={onOpenInfo}
          />
        ))
        .reverse()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
});
