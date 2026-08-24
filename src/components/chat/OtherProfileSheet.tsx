import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PublicProfileRow } from "../../types/database";
import { getPublicProfile, listProfilePhotos } from "../../services/supabase/profiles";
import { getSignedPhotoUrl } from "../../services/supabase/storage";
import { VerifiedBadge } from "../ui/VerifiedBadge";
import {
  dominantHandLabel,
  gamePreferenceLabel,
  playPreferenceLabel,
  playingFrequencyLabel,
  skillLevelLabel,
  yearsPlayingLabel,
} from "../../constants/pickleballOptions";

interface OtherProfileSheetProps {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
}

/**
 * Read-only view of another user's profile, reached by tapping the chat
 * header. Deliberately a self-contained modal (fetches its own data from
 * userId) rather than parameterizing app/(tabs)/profile/index.tsx — that
 * screen is built specifically around "my own profile" (useProfile,
 * ProfileRow, an Edit button); this only needs the same browsable subset
 * discovery already shows via public_profiles, so it mirrors
 * MoreInfoSheet's layout/fields instead of reusing that screen.
 */
export function OtherProfileSheet({ visible, userId, onClose }: OtherProfileSheetProps) {
  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !userId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setProfile(null);
    setPhotoUrl(null);

    (async () => {
      try {
        const [profileRow, photos] = await Promise.all([
          getPublicProfile(userId),
          listProfilePhotos(userId),
        ]);
        if (cancelled) return;
        setProfile(profileRow);
        const primaryPath = photos[0]?.storage_path ?? null;
        setPhotoUrl(primaryPath ? await getSignedPhotoUrl(primaryPath) : null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load this profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, userId]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        ) : error || !profile ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error ?? "Couldn't load this profile."}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={styles.photoPlaceholderText}>{profile.first_name}</Text>
              </View>
            )}

            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {profile.first_name}, {profile.age}
              </Text>
              <VerifiedBadge verified={profile.email_verified} size={18} />
            </View>
            {profile.city || profile.region ? (
              <Text style={styles.location}>
                {[profile.city, profile.region].filter(Boolean).join(", ")}
              </Text>
            ) : null}
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Pickleball</Text>
              <InfoRow label="Skill level" value={skillLevelLabel(profile.skill_level)} />
              {profile.dupr_rating != null && (
                <InfoRow
                  label="DUPR rating"
                  value={`${profile.dupr_rating} (self-entered, unverified)`}
                />
              )}
              <InfoRow label="Prefers" value={gamePreferenceLabel(profile.game_preference)} />
              <InfoRow label="Style" value={playPreferenceLabel(profile.play_preference)} />
              <InfoRow label="Dominant hand" value={dominantHandLabel(profile.dominant_hand)} />
              <InfoRow label="Plays" value={playingFrequencyLabel(profile.playing_frequency)} />
              <InfoRow label="Years playing" value={yearsPlayingLabel(profile.years_playing)} />
              {profile.favorite_shot ? (
                <InfoRow label="Favorite shot" value={profile.favorite_shot} />
              ) : null}
              {profile.play_style ? (
                <InfoRow label="Play style" value={profile.play_style} />
              ) : null}
            </View>
          </ScrollView>
        )}

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
    maxHeight: "80%",
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
  center: { minHeight: 200, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#d33", fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  content: { paddingHorizontal: 24, paddingBottom: 12 },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: "center",
    backgroundColor: "#eee",
    marginBottom: 12,
  },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { color: "#999", fontWeight: "700" },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  name: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  location: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 4 },
  bio: { fontSize: 15, color: "#333", lineHeight: 20, marginTop: 14 },
  section: { marginTop: 16, marginBottom: 8 },
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
