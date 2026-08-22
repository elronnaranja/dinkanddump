import { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthSession } from "../../../src/services/supabase/auth";
import { useProfile } from "../../../src/hooks/useProfile";
import { useProfileMedia } from "../../../src/hooks/useProfileMedia";
import { calculateAge } from "../../../src/utils/age";
import {
  dominantHandLabel,
  gamePreferenceLabel,
  playPreferenceLabel,
  playingFrequencyLabel,
} from "../../../src/constants/pickleballOptions";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const userId = session?.user.id ?? null;
  const { profile, loading: profileLoading, error: profileError } = useProfile(userId);
  const {
    photos,
    video,
    videoThumbnailUrl,
    loading: mediaLoading,
  } = useProfileMedia(userId);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

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
  const activePhoto = photos[activePhotoIndex] ?? photos[0];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My profile</Text>
        <Pressable onPress={() => router.push("/(tabs)/profile/edit")}>
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
      </View>

      {photos.length > 0 ? (
        <View>
          <Image source={{ uri: activePhoto?.url ?? undefined }} style={styles.mainPhoto} />
          {photos.length > 1 && (
            <View style={styles.thumbRow}>
              {photos.map((p, index) => (
                <Pressable key={p.row.id} onPress={() => setActivePhotoIndex(index)}>
                  <Image
                    source={{ uri: p.url ?? undefined }}
                    style={[
                      styles.thumb,
                      index === activePhotoIndex && styles.thumbActive,
                    ]}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.mainPhoto, styles.photoPlaceholder]}>
          <Text style={styles.placeholderText}>No photos yet</Text>
        </View>
      )}

      {video && (
        <View style={styles.videoSection}>
          <Text style={styles.sectionLabel}>Highlight video</Text>
          {videoThumbnailUrl ? (
            <Image source={{ uri: videoThumbnailUrl }} style={styles.videoThumb} />
          ) : (
            <View style={[styles.videoThumb, styles.photoPlaceholder]}>
              <Text style={styles.placeholderText}>Video</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.name}>
          {profile.first_name}, {age}
        </Text>
        {location ? <Text style={styles.location}>{location}</Text> : null}
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Pickleball</Text>
        <InfoRow label="Skill level" value={profile.skill_level} />
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
        <InfoRow label="Years playing" value={String(profile.years_playing)} />
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: "700" },
  editLink: { color: "#1a7f37", fontWeight: "600", fontSize: 16 },
  mainPhoto: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.1, backgroundColor: "#eee" },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { color: "#999" },
  thumbRow: { flexDirection: "row", gap: 8, padding: 12 },
  thumb: { width: 56, height: 56, borderRadius: 8, opacity: 0.6 },
  thumbActive: { opacity: 1, borderWidth: 2, borderColor: "#1a7f37" },
  videoSection: { paddingHorizontal: 20, marginTop: 16 },
  videoThumb: { width: "100%", height: 200, borderRadius: 10, backgroundColor: "#eee" },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#999", marginBottom: 8 },
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
