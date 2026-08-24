import { useState } from "react";
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ProfilePhotoWithUrl } from "../../hooks/useProfileMedia";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const SIDE_INSET = 24;
// A card peeks in at the edge rather than filling the viewport, so the
// carousel reads as "there's more" without needing dots to communicate it.
const CARD_WIDTH = SCREEN_WIDTH - SIDE_INSET * 2;
// 4:5 portrait everywhere media is shown (Discover's full-details sheet and
// the profile screen both use this component) — one consistent shape for
// every photo and video, matching PhotoManager's upload crop (see
// PhotoManager.tsx's `aspect: [4, 5]`) and VideoManager's portrait check.
const CARD_HEIGHT = Math.round(CARD_WIDTH * (5 / 4));
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

interface MediaSliderProps {
  photos: ProfilePhotoWithUrl[];
  hasVideo: boolean;
  videoThumbnailUrl: string | null;
  onOpenVideo: () => void;
}

/**
 * Photo + video carousel for the full-details sheet and the profile screen.
 * Renders as a peeking card carousel (each card narrower than the viewport,
 * with a gap and a sliver of the next one visible) rather than full-bleed
 * pages, and is meant to sit inline in the surrounding vertical ScrollView
 * (not pinned above it) so it scrolls away with the rest of the content.
 * The card itself (DiscoveryCard) already lets you tap the edges to cycle
 * photos one at a time, but that's a discovery-speed shortcut, not a real
 * way to browse everything someone posted — this is the "actually look
 * through their media" view, so a video (if any) is appended as a final
 * card rather than hidden behind a separate badge.
 */
export function MediaSlider({ photos, hasVideo, videoThumbnailUrl, onOpenVideo }: MediaSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slideCount = photos.length + (hasVideo ? 1 : 0);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    setActiveIndex(index);
  }

  if (slideCount === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.placeholder]}>
          <Text style={styles.placeholderText}>No photos yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {photos.map((photo) =>
          photo.url ? (
            <Image key={photo.row.id} source={{ uri: photo.url }} style={styles.card} />
          ) : (
            <View key={photo.row.id} style={[styles.card, styles.placeholder]}>
              <Text style={styles.placeholderText}>Photo unavailable</Text>
            </View>
          )
        )}

        {hasVideo && (
          <Pressable style={styles.card} onPress={onOpenVideo} accessibilityLabel="Play gameplay video">
            {videoThumbnailUrl ? (
              <Image source={{ uri: videoThumbnailUrl }} style={StyleSheet.absoluteFillObject} />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, styles.videoPlaceholder]} />
            )}
            <View style={styles.playButton}>
              <Text style={styles.playButtonText}>{"▶"}</Text>
            </View>
          </Pressable>
        )}
      </ScrollView>

      {slideCount > 1 && (
        <View style={styles.dotsRow}>
          {Array.from({ length: slideCount }).map((_, index) => (
            <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 4 },
  scrollContent: { paddingHorizontal: SIDE_INSET, gap: CARD_GAP },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#eee",
  },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { color: "#999" },
  videoPlaceholder: { backgroundColor: "#222" },
  playButton: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonText: {
    color: "#fff",
    fontSize: 28,
    backgroundColor: "rgba(0,0,0,0.45)",
    width: 64,
    height: 64,
    borderRadius: 32,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ddd",
  },
  dotActive: { backgroundColor: "#1a7f37", width: 8, height: 8, borderRadius: 4 },
});
