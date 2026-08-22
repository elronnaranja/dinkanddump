import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { DiscoveryCandidate } from "../../types/domain";
import {
  dominantHandLabel,
  gamePreferenceLabel,
  playPreferenceLabel,
  playingFrequencyLabel,
  skillLevelLabel,
  yearsPlayingLabel,
} from "../../constants/pickleballOptions";

interface MoreInfoSheetProps {
  visible: boolean;
  candidate: DiscoveryCandidate | null;
  onClose: () => void;
}

/**
 * The "swipe up for more info" affordance, implemented as a bottom sheet
 * modal (plain RN Modal — no bottom-sheet library in the project yet, and
 * this content doesn't need one). Surfaces the fields that don't fit on
 * the minimal card face: bio, play style, frequency, years playing, DUPR,
 * dominant hand.
 */
export function MoreInfoSheet({ visible, candidate, onClose }: MoreInfoSheetProps) {
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
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.name}>
            {candidate.firstName}, {candidate.age}
          </Text>

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

        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
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
    maxHeight: "75%",
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginBottom: 12,
  },
  content: { paddingHorizontal: 24, paddingBottom: 12 },
  name: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
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
  closeButton: {
    marginHorizontal: 24,
    marginVertical: 16,
    backgroundColor: "#1a7f37",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
