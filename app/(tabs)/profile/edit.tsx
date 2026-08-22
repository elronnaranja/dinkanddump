import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useAuthSession } from "../../../src/services/supabase/auth";
import { useProfile } from "../../../src/hooks/useProfile";
import { updateProfile, isUsernameAvailable } from "../../../src/services/supabase/profiles";
import { PhotoManager } from "../../../src/components/profile/PhotoManager";
import { VideoManager } from "../../../src/components/profile/VideoManager";
import { SegmentedChoice } from "../../../src/components/ui/SegmentedChoice";
import {
  SKILL_LEVEL_OPTIONS,
  GAME_PREFERENCE_OPTIONS,
  PLAY_PREFERENCE_OPTIONS,
  DOMINANT_HAND_OPTIONS,
  PLAYING_FREQUENCY_OPTIONS,
  GENDER_OPTIONS,
} from "../../../src/constants/pickleballOptions";
import type {
  DominantHand,
  GamePreference,
  Gender,
  PlayPreference,
  PlayingFrequency,
  SkillLevel,
} from "../../../src/types/database";

export default function EditProfileScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const userId = session?.user.id ?? null;
  const { profile, loading, error: loadError, refresh } = useProfile(userId);

  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "ok" | "taken" | "checking">(
    "idle"
  );
  const [gender, setGender] = useState<Gender | null>(null);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("2.5");
  const [gamePreference, setGamePreference] = useState<GamePreference>("both");
  const [playPreference, setPlayPreference] = useState<PlayPreference>("both");
  const [dominantHand, setDominantHand] = useState<DominantHand>("right");
  const [playingFrequency, setPlayingFrequency] = useState<PlayingFrequency>("weekly");
  const [yearsPlaying, setYearsPlaying] = useState("0");
  const [favoriteShot, setFavoriteShot] = useState("");
  const [playStyle, setPlayStyle] = useState("");
  const [duprRating, setDuprRating] = useState("");

  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name);
    setUsername(profile.username);
    setGender(profile.gender);
    setBio(profile.bio ?? "");
    setCity(profile.city ?? "");
    setRegion(profile.region ?? "");
    setCountry(profile.country ?? "");
    setLatitude(profile.latitude);
    setLongitude(profile.longitude);
    setSkillLevel(profile.skill_level);
    setGamePreference(profile.game_preference);
    setPlayPreference(profile.play_preference);
    setDominantHand(profile.dominant_hand);
    setPlayingFrequency(profile.playing_frequency);
    setYearsPlaying(String(profile.years_playing));
    setFavoriteShot(profile.favorite_shot ?? "");
    setPlayStyle(profile.play_style ?? "");
    setDuprRating(profile.dupr_rating != null ? String(profile.dupr_rating) : "");
  }, [profile]);

  async function checkUsername(value: string) {
    if (!profile || value === profile.username) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    try {
      const available = await isUsernameAvailable(value, userId ?? undefined);
      setUsernameStatus(available ? "ok" : "taken");
    } catch {
      setUsernameStatus("idle");
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    setSaveError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setSaveError("Location permission denied. You can still edit city/region manually.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      setCity(place?.city ?? place?.subregion ?? city);
      setRegion(place?.region ?? region);
      setCountry(place?.country ?? country);
    } catch {
      setSaveError("Couldn't determine your location.");
    } finally {
      setLocating(false);
    }
  }

  const yearsPlayingNumber = Number(yearsPlaying);
  const duprNumber = duprRating.trim() ? Number(duprRating) : null;
  const canSave =
    !!userId &&
    firstName.trim().length > 0 &&
    usernameStatus !== "taken" &&
    Number.isFinite(yearsPlayingNumber) &&
    yearsPlayingNumber >= 0 &&
    yearsPlayingNumber <= 100 &&
    (duprNumber === null || (Number.isFinite(duprNumber) && duprNumber >= 0 && duprNumber <= 8));

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateProfile(userId, {
        first_name: firstName.trim(),
        username: username.trim(),
        gender,
        bio: bio || null,
        city: city || null,
        region: region || null,
        country: country || null,
        latitude,
        longitude,
        skill_level: skillLevel,
        dupr_rating: duprNumber,
        game_preference: gamePreference,
        play_preference: playPreference,
        dominant_hand: dominantHand,
        playing_frequency: playingFrequency,
        years_playing: yearsPlayingNumber,
        favorite_shot: favoriteShot || null,
        play_style: playStyle || null,
      });
      await refresh();
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (loadError || !profile || !userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{loadError ?? "No profile found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Edit profile</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelLink}>Close</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Photos</Text>
      <PhotoManager userId={userId} />

      <Text style={styles.sectionLabel}>Highlight video</Text>
      <VideoManager userId={userId} />

      <Text style={styles.sectionLabel}>Basic info</Text>
      <Text style={styles.label}>First name</Text>
      <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
        onEndEditing={() => checkUsername(username)}
      />
      {usernameStatus === "checking" && <Text style={styles.hint}>Checking...</Text>}
      {usernameStatus === "taken" && <Text style={styles.error}>Username already taken.</Text>}

      <Text style={styles.label}>Gender</Text>
      <SegmentedChoice options={GENDER_OPTIONS} value={gender} onChange={setGender} columns={2} />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        maxLength={280}
        value={bio}
        onChangeText={setBio}
      />

      <Text style={styles.sectionLabel}>Location</Text>
      <Pressable onPress={useCurrentLocation} disabled={locating}>
        <Text style={styles.linkButton}>
          {locating ? "Locating..." : "Update from current location"}
        </Text>
      </Pressable>
      <Text style={styles.label}>City</Text>
      <TextInput style={styles.input} value={city} onChangeText={setCity} />
      <Text style={styles.label}>Region</Text>
      <TextInput style={styles.input} value={region} onChangeText={setRegion} />
      <Text style={styles.label}>Country</Text>
      <TextInput style={styles.input} value={country} onChangeText={setCountry} />

      <Text style={styles.sectionLabel}>Pickleball</Text>
      <Text style={styles.label}>Skill level</Text>
      <SegmentedChoice
        options={SKILL_LEVEL_OPTIONS}
        value={skillLevel}
        onChange={setSkillLevel}
        columns={5}
      />
      <Text style={styles.label}>Game preference</Text>
      <SegmentedChoice
        options={GAME_PREFERENCE_OPTIONS}
        value={gamePreference}
        onChange={setGamePreference}
        columns={3}
      />
      <Text style={styles.label}>Play preference</Text>
      <SegmentedChoice
        options={PLAY_PREFERENCE_OPTIONS}
        value={playPreference}
        onChange={setPlayPreference}
        columns={3}
      />
      <Text style={styles.label}>Dominant hand</Text>
      <SegmentedChoice
        options={DOMINANT_HAND_OPTIONS}
        value={dominantHand}
        onChange={setDominantHand}
        columns={3}
      />
      <Text style={styles.label}>Playing frequency</Text>
      <SegmentedChoice
        options={PLAYING_FREQUENCY_OPTIONS}
        value={playingFrequency}
        onChange={setPlayingFrequency}
        columns={2}
      />
      <Text style={styles.label}>Years playing</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={yearsPlaying}
        onChangeText={(v) => setYearsPlaying(v.replace(/[^0-9]/g, ""))}
      />
      <Text style={styles.label}>DUPR rating (optional, self-entered/unverified)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={duprRating}
        onChangeText={setDuprRating}
      />
      <Text style={styles.label}>Favorite shot</Text>
      <TextInput style={styles.input} value={favoriteShot} onChangeText={setFavoriteShot} />
      <Text style={styles.label}>Play style</Text>
      <TextInput style={styles.input} value={playStyle} onChangeText={setPlayStyle} />

      {saveError && <Text style={styles.error}>{saveError}</Text>}
      {saved && <Text style={styles.success}>Saved.</Text>}

      <Pressable
        style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave || saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save changes</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "700" },
  cancelLink: { color: "#666", fontSize: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#999",
    marginTop: 24,
    marginBottom: 10,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  hint: { fontSize: 12, color: "#666", marginTop: 4 },
  linkButton: { color: "#1a7f37", fontWeight: "600", marginBottom: 8 },
  saveButton: {
    backgroundColor: "#1a7f37",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "#d33", fontSize: 12, marginTop: 8 },
  success: { color: "#1a7f37", fontSize: 12, marginTop: 8 },
});
