import { useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StepProgressBar } from "../../src/components/ui/StepProgressBar";
import { WizardNav } from "../../src/components/ui/WizardNav";
import { SegmentedChoice } from "../../src/components/ui/SegmentedChoice";
import {
  SKILL_LEVEL_OPTIONS,
  GAME_PREFERENCE_OPTIONS,
  PLAY_PREFERENCE_OPTIONS,
  DOMINANT_HAND_OPTIONS,
  PLAYING_FREQUENCY_OPTIONS,
  YEARS_PLAYING_OPTIONS,
  FAVORITE_SHOT_OPTIONS,
  PLAY_STYLE_OPTIONS,
} from "../../src/constants/pickleballOptions";
import { useOnboarding } from "../../src/context/OnboardingContext";
import { useAuthSession } from "../../src/services/supabase/auth";
import { upsertProfile } from "../../src/services/supabase/profiles";

export default function PickleballProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthSession();
  const { state, update, setProfileCreated } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duprNumber = state.duprRating.trim() ? Number(state.duprRating) : null;

  const canContinue =
    !!state.skillLevel &&
    !!state.yearsPlaying &&
    (duprNumber === null || (Number.isFinite(duprNumber) && duprNumber >= 0 && duprNumber <= 8));

  async function handleNext() {
    if (!session || !state.skillLevel || !state.dateOfBirth || !state.yearsPlaying) {
      setError("Missing required info from earlier steps. Please go back and check.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await upsertProfile({
        id: session.user.id,
        username: state.username,
        first_name: state.firstName,
        date_of_birth: state.dateOfBirth,
        gender: state.gender,
        bio: state.bio || null,
        city: state.city || null,
        region: state.region || null,
        country: state.country || null,
        latitude: state.latitude,
        longitude: state.longitude,
        skill_level: state.skillLevel,
        dupr_rating: duprNumber,
        game_preference: state.gamePreference,
        play_preference: state.playPreference,
        dominant_hand: state.dominantHand,
        playing_frequency: state.playingFrequency,
        years_playing: state.yearsPlaying,
        favorite_shot: state.favoriteShot || null,
        play_style: state.playStyle || null,
        onboarding_completed: false,
      });
      setProfileCreated(true);
      router.push("/(onboarding)/photos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save your profile. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 24 }]}>
      <StepProgressBar currentStep={3} totalSteps={5} label="Pickleball profile" />
      <Text style={styles.title}>Your pickleball profile</Text>

      <Text style={styles.label}>Skill level</Text>
      <SegmentedChoice
        options={SKILL_LEVEL_OPTIONS}
        value={state.skillLevel}
        onChange={(v) => update({ skillLevel: v })}
        columns={5}
      />

      <Text style={styles.label}>Game preference</Text>
      <SegmentedChoice
        options={GAME_PREFERENCE_OPTIONS}
        value={state.gamePreference}
        onChange={(v) => update({ gamePreference: v })}
        columns={3}
      />

      <Text style={styles.label}>Play preference</Text>
      <SegmentedChoice
        options={PLAY_PREFERENCE_OPTIONS}
        value={state.playPreference}
        onChange={(v) => update({ playPreference: v })}
        columns={3}
      />

      <Text style={styles.label}>Dominant hand</Text>
      <SegmentedChoice
        options={DOMINANT_HAND_OPTIONS}
        value={state.dominantHand}
        onChange={(v) => update({ dominantHand: v })}
        columns={3}
      />

      <Text style={styles.label}>Playing frequency</Text>
      <SegmentedChoice
        options={PLAYING_FREQUENCY_OPTIONS}
        value={state.playingFrequency}
        onChange={(v) => update({ playingFrequency: v })}
        columns={2}
      />

      <Text style={styles.label}>Years playing</Text>
      <SegmentedChoice
        options={YEARS_PLAYING_OPTIONS}
        value={state.yearsPlaying}
        onChange={(v) => update({ yearsPlaying: v })}
        columns={2}
      />

      <Text style={styles.label}>DUPR rating (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 3.75"
        keyboardType="decimal-pad"
        value={state.duprRating}
        onChangeText={(v) => update({ duprRating: v })}
      />
      <Text style={styles.hint}>
        Self-entered and unverified — not confirmed against the official DUPR system.
      </Text>

      <Text style={styles.label}>Favorite shot (optional)</Text>
      <SegmentedChoice
        options={FAVORITE_SHOT_OPTIONS}
        value={state.favoriteShot || null}
        onChange={(v) => update({ favoriteShot: v })}
        columns={2}
      />

      <Text style={styles.label}>Play style (optional)</Text>
      <SegmentedChoice
        options={PLAY_STYLE_OPTIONS}
        value={state.playStyle || null}
        onChange={(v) => update({ playStyle: v })}
        columns={2}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <WizardNav
        onBack={() => router.back()}
        nextDisabled={!canContinue}
        loading={submitting}
        onNext={handleNext}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  hint: { fontSize: 12, color: "#666", marginTop: 4 },
  error: { fontSize: 12, color: "#d33", marginTop: 12 },
});
