import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { DiscoveryCandidate } from "../../types/domain";
import type { ProfilePhotoWithUrl } from "../../hooks/useProfileMedia";
import {
  dominantHandLabel,
  gamePreferenceLabel,
  playPreferenceLabel,
  playingFrequencyLabel,
  skillLevelLabel,
  yearsPlayingLabel,
} from "../../constants/pickleballOptions";
import { VerifiedBadge } from "../ui/VerifiedBadge";
import { MediaSlider } from "./MediaSlider";
import { ActionButtons } from "./ActionButtons";

interface MoreInfoSheetProps {
  visible: boolean;
  candidate: DiscoveryCandidate | null;
  photos: ProfilePhotoWithUrl[];
  hasVideo: boolean;
  videoThumbnailUrl: string | null;
  onOpenVideo: () => void;
  onClose: () => void;
  onReport: () => void;
  onDump: () => void;
  onDink: () => void;
  actionsDisabled?: boolean;
}

/**
 * The "swipe up for more info" affordance, implemented as a bottom sheet
 * modal (plain RN Modal — no bottom-sheet library in the project yet, and
 * this content doesn't need one). This is also where the explicit Dump/Dink
 * buttons now live (see app/(tabs)/discover.tsx) — the main Discover screen
 * only takes swipe gestures, so anyone who wants tap-to-act controls opens
 * the full details first.
 */
export function MoreInfoSheet({
  visible,
  candidate,
  photos,
  hasVideo,
  videoThumbnailUrl,
  onOpenVideo,
  onClose,
  onReport,
  onDump,
  onDink,
  actionsDisabled,
}: MoreInfoSheetProps) {
  if (!candidate) return null;

  const hasAnyExtra =
    candidate.bio ||
    candidate.playStyle ||
    candidate.playingFrequency ||
    candidate.yearsPlaying != null ||
    candidate.duprRating != null ||
    candidate.dominantHand;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.headerRow}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {candidate.firstName}, {candidate.age}
            </Text>
            <VerifiedBadge verified={candidate.emailVerified} size={18} />
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.iconButton}
              onPress={onReport}
              hitSlop={8}
              accessibilityLabel={`Report ${candidate.firstName}`}
            >
              <Text style={styles.flagIcon}>{"\u{1F6A9}"}</Text>
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Close"
            >
              <Text style={styles.closeIcon}>{"✕"}</Text>
            </Pressable>
          </View>
        </View>

        <MediaSlider
          photos={photos}
          hasVideo={hasVideo}
          videoThumbnailUrl={videoThumbnailUrl}
          onOpenVideo={onOpenVideo}
        />

        <ScrollView contentContainerStyle={styles.content}>
          {candidate.bio ? <Text style={styles.bio}>{candidate.bio}</Text> : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Pickleball</Text>
            <InfoRow label="Skill level" value={skillLevelLabel(candidate.skillLevel)} />
            {candidate.duprRating != null && (
              <InfoRow
                label="DUPR rating"
                value={`${candidate.duprRating} (self-entered, unverified)`}
              />
            )}
            {candidate.gamePreference && (
              <InfoRow label="Prefers" value={gamePreferenceLabel(candidate.gamePreference)} />
            )}
            {candidate.playPreference && (
              <InfoRow label="Style" value={playPreferenceLabel(candidate.playPreference)} />
            )}
            {candidate.dominantHand && (
              <InfoRow label="Dominant hand" value={dominantHandLabel(candidate.dominantHand)} />
            )}
            {candidate.playingFrequency && (
              <InfoRow label="Plays" value={playingFrequencyLabel(candidate.playingFrequency)} />
            )}
            {candidate.yearsPlaying != null && (
              <InfoRow label="Years playing" value={yearsPlayingLabel(candidate.yearsPlaying)} />
            )}
            {candidate.favoriteShot ? (
              <InfoRow label="Favorite shot" value={candidate.favoriteShot} />
            ) : null}
            {candidate.playStyle ? (
              <InfoRow label="Play style" value={candidate.playStyle} />
            ) : null}
          </View>

          {!hasAnyExtra && (
            <Text style={styles.hint}>
              {candidate.firstName} hasn't shared more pickleball details yet.
            </Text>
          )}
        </ScrollView>

        <ActionButtons onDump={onDump} onDink={onDink} disabled={actionsDisabled} />
      </View>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingTop: 10,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  name: { fontSize: 20, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  flagIcon: { fontSize: 14 },
  closeIcon: { fontSize: 15, color: "#666", fontWeight: "700" },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  bio: { fontSize: 15, color: "#333", lineHeight: 20, marginBottom: 16 },
  section: { marginTop: 8, marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#999", marginBottom: 8 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: { fontSize: 14, color: "#666" },
  infoValue: { fontSize: 14, color: "#333", fontWeight: "500" },
  hint: { fontSize: 13, color: "#999", marginTop: 8, marginBottom: 16 },
});
