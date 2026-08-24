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
const SLIDER_HEIGHT = 340;

interface MediaSliderProps {
  photos: ProfilePhotoWithUrl[];
  hasVideo: boolean;
  videoThumbnailUrl: string | null;
  onOpenVideo: () => void;
}

/**
 * Swipeable photo + video carousel for the full-details sheet. The card
 * itself (DiscoveryCard) already lets you tap the edges to cycle photos one
 * at a time, but that's a discovery-speed shortcut, not a real way to browse
 * everything someone posted — this is the "actually look through their
 * media" view, so a video (if any) is appended as a final slide rather than
 * hidden behind a separate badge.
 */
export function MediaSlider({ photos, hasVideo, videoThumbnailUrl, onOpenVideo }: MediaSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slideCount = photos.length + (hasVideo ? 1 : 0);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  }

  if (slideCount === 0) {
    return (
      <View style={[styles.slide, styles.placeholder]}>
        <Text style={styles.placeholderText}>No photos yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {photos.map((photo, index) =>
          photo.url ? (
            <Image key={photo.row.id} source={{ uri: photo.url }} style={styles.slide} />
          ) : (
            <View key={photo.row.id} style={[styles.slide, styles.placeholder]}>
              <Text style={styles.placeholderText}>Photo unavailable</Text>
            </View>
          )
        )}

        {hasVideo && (
          <Pressable style={styles.slide} onPress={onOpenVideo} accessibilityLabel="Play gameplay video">
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
  container: { height: SLIDER_HEIGHT, backgroundColor: "#eee" },
  slide: { width: SCREEN_WIDTH, height: SLIDER_HEIGHT },
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#eee" },
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
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: { backgroundColor: "#fff", width: 8, height: 8, borderRadius: 4 },
});
