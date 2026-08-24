import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthSession } from "../../../src/services/supabase/auth";
import { useProfile } from "../../../src/hooks/useProfile";
import { useProfileMedia } from "../../../src/hooks/useProfileMedia";
import { VerifiedBadge } from "../../../src/components/ui/VerifiedBadge";
import { MediaSlider } from "../../../src/components/discovery/MediaSlider";
import { VideoModal } from "../../../src/components/discovery/VideoModal";
import { calculateAge } from "../../../src/utils/age";
import {
  dominantHandLabel,
  gamePreferenceLabel,
  playPreferenceLabel,
  playingFrequencyLabel,
  skillLevelLabel,
  yearsPlayingLabel,
} from "../../../src/constants/pickleballOptions";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuthSession();
  const userId = session?.user.id ?? null;
  const { profile, loading: profileLoading, error: profileError } = useProfile(userId);
  const {
    photos,
    video,
    videoUrl,
    videoThumbnailUrl,
    loading: mediaLoading,
  } = useProfileMedia(userId);
  const [videoVisible, setVideoVisible] = useState(false);

  if (profileLoading || mediaLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (profileError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{profileError}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>No profile found.</Text>
      </View>
    );
  }

  const age = calculateAge(profile.date_of_birth);
  const location = [profile.city, profile.region].filter(Boolean).join(", ");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>My profile</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/(tabs)/profile/edit")}>
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/profile/settings")}>
            <Text style={styles.settingsLink}>Settings</Text>
          </Pressable>
        </View>
      </View>

      <MediaSlider
        photos={photos}
        hasVideo={!!video}
        videoThumbnailUrl={videoThumbnailUrl}
        onOpenVideo={() => setVideoVisible(true)}
      />
      <VideoModal
        visible={videoVisible}
        videoUrl={videoUrl}
        onClose={() => setVideoVisible(false)}
      />

      <View style={styles.section}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {profile.first_name}, {age}
          </Text>
          <VerifiedBadge verified={profile.email_verified} size={18} />
        </View>
        {location ? <Text style={styles.location}>{location}</Text> : null}
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

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
        {profile.play_style ? <InfoRow label="Play style" value={profile.play_style} /> : null}
      </View>
    </ScrollView>
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
  container: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  editLink: { color: "#1a7f37", fontWeight: "600", fontSize: 16 },
  settingsLink: { color: "#666", fontWeight: "600", fontSize: 16 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#999", marginBottom: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 24, fontWeight: "700" },
  location: { fontSize: 15, color: "#666", marginTop: 4 },
  bio: { fontSize: 15, color: "#333", marginTop: 10, lineHeight: 20 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: { fontSize: 14, color: "#666" },
  infoValue: { fontSize: 14, color: "#333", fontWeight: "500" },
  error: { color: "#d33" },
  body: { color: "#666" },
});
