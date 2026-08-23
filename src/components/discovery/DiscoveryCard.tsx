import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { DiscoveryCandidate } from "../../types/domain";
import type { ProfilePhotoWithUrl } from "../../hooks/useProfileMedia";
import { formatDistanceKm } from "../../utils/distance";
import { gamePreferenceLabel, skillLevelLabel } from "../../constants/pickleballOptions";

interface DiscoveryCardProps {
  candidate: DiscoveryCandidate;
  /**
   * Full photo set for this candidate. Only populated for the top-of-stack
   * card (see discover.tsx, which prefetches via useProfileMedia for
   * whichever candidate is current) — peek cards behind it just show the
   * primary photo and pass an empty array here, which is cheap and avoids
   * fetching signed URLs for cards the user hasn't reached yet.
   */
  photos: ProfilePhotoWithUrl[];
  hasVideo: boolean;
  /** Disables photo-cycling taps and the info/video badges for peek cards. */
  interactive: boolean;
  onOpenVideo: () => void;
  onOpenInfo: () => void;
}

export function DiscoveryCard({
  candidate,
  photos,
  hasVideo,
  interactive,
  onOpenVideo,
  onOpenInfo,
}: DiscoveryCardProps) {
  const photoUrls = photos.length > 0 ? photos.map((p) => p.url) : [candidate.primaryPhotoUrl];
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset to the primary photo whenever the underlying candidate (or its
  // resolved photo set) changes, so we don't show a stale index.
  useEffect(() => {
    setActiveIndex(0);
  }, [candidate.id, photos.length]);

  const clampedIndex = Math.min(activeIndex, photoUrls.length - 1);
  const activeUrl = photoUrls[clampedIndex];

  function goPrev() {
    setActiveIndex((i) => Math.max(0, i - 1));
  }
  function goNext() {
    setActiveIndex((i) => Math.min(photoUrls.length - 1, i + 1));
  }

  const subtitleParts = [
    candidate.city ?? undefined,
    formatDistanceKm(candidate.distanceKm),
  ].filter(Boolean);

  return (
    <View style={styles.card}>
      {activeUrl ? (
        <Image source={{ uri: activeUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>No photo yet</Text>
        </View>
      )}

      {interactive && photoUrls.length > 1 && (
        <>
          <Pressable style={styles.tapZoneLeft} onPress={goPrev} />
          <Pressable style={styles.tapZoneRight} onPress={goNext} />
          <View style={styles.dotsRow}>
            {photoUrls.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === clampedIndex && styles.dotActive]}
              />
            ))}
          </View>
        </>
      )}

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.75)"]}
        style={styles.gradient}
        pointerEvents="none"
      />

      <View style={styles.infoOverlay} pointerEvents="box-none">
        <Text style={styles.nameLine}>
          {candidate.firstName}, {candidate.age}
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{skillLevelLabel(candidate.skillLevel)}</Text>
          </View>
          {candidate.gamePreference && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{gamePreferenceLabel(candidate.gamePreference)}</Text>
            </View>
          )}
        </View>
        {subtitleParts.length > 0 && (
          <Text style={styles.subtitle}>{subtitleParts.join(" - ")}</Text>
        )}
      </View>

      {interactive && (
        <View style={styles.actionBadges} pointerEvents="box-none">
          {hasVideo && (
            <Pressable style={styles.iconBadge} onPress={onOpenVideo} accessibilityLabel="Play gameplay video">
              <Text style={styles.iconBadgeText}>Video</Text>
            </Pressable>
          )}
          <Pressable style={styles.iconBadge} onPress={onOpenInfo} accessibilityLabel="More info">
            <Text style={styles.iconBadgeText}>Info</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#eee",
  },
  image: { ...StyleSheet.absoluteFillObject },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { color: "#999" },
  tapZoneLeft: { position: "absolute", top: 0, bottom: 0, left: 0, width: "50%" },
  tapZoneRight: { position: "absolute", top: 0, bottom: 0, right: 0, width: "50%" },
  dotsRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: { backgroundColor: "#fff" },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  infoOverlay: { position: "absolute", left: 20, right: 20, bottom: 20 },
  nameLine: { color: "#fff", fontSize: 26, fontWeight: "800" },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  badge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 14, marginTop: 6 },
  actionBadges: {
    position: "absolute",
    right: 16,
    bottom: 96,
    gap: 10,
  },
  iconBadge: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  iconBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
