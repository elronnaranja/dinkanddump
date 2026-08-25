import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { DiscoveryCandidate } from "../../types/domain";
import type { ProfilePhotoWithUrl } from "../../hooks/useProfileMedia";
import { formatDistanceKm } from "../../utils/distance";
import { gamePreferenceLabel, skillLevelLabel } from "../../constants/pickleballOptions";
import { VerifiedBadge } from "../ui/VerifiedBadge";

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

      {/*
        Tapping the card opens the full info sheet — this sits underneath
        (rendered first, so later siblings win hit-testing) the narrow
        photo-cycle edge strips below, which is what keeps prev/next photo
        taps working without needing every tap on the card to be claimed by
        one specific zone. Gated on `interactive` the same as everything
        else here: peek cards behind the top of the stack shouldn't react
        to taps at all.
      */}
      {interactive && <Pressable style={styles.infoTapLayer} onPress={onOpenInfo} />}

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
        <View style={styles.nameRow}>
          <Text style={styles.nameLine}>
            {candidate.firstName}, {candidate.age}
          </Text>
          <VerifiedBadge verified={candidate.emailVerified} size={20} />
        </View>
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

      {interactive && hasVideo && (
        <View style={styles.actionBadges} pointerEvents="box-none">
          <Pressable style={styles.iconBadge} onPress={onOpenVideo} accessibilityLabel="Play gameplay video">
            <Text style={styles.iconBadgeText}>Video</Text>
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
  infoTapLayer: { ...StyleSheet.absoluteFillObject },
  // Narrow edge strips for photo prev/next, leaving the large middle
  // portion of the card free to fall through to infoTapLayer above.
  tapZoneLeft: { position: "absolute", top: 0, bottom: 0, left: 0, width: "22%" },
  tapZoneRight: { position: "absolute", top: 0, bottom: 0, right: 0, width: "22%" },
  dotsRow: {
    position: "absolute",
    top: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: { backgroundColor: "#fff", width: 8, height: 8, borderRadius: 4 },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  infoOverlay: { position: "absolute", left: 20, right: 20, bottom: 20 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
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
