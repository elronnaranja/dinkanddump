import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { StepProgressBar } from "../../src/components/ui/StepProgressBar";
import { WizardNav } from "../../src/components/ui/WizardNav";
import { VideoManager } from "../../src/components/profile/VideoManager";
import { useAuthSession } from "../../src/services/supabase/auth";
import { setOnboardingCompleted } from "../../src/services/supabase/profiles";
import { track } from "../../src/services/analytics/track";

export default function VideoScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finishOnboarding() {
    if (!session) return;
    setFinishing(true);
    setError(null);
    try {
      await setOnboardingCompleted(session.user.id, true);
      track("onboarding_completed");
      router.replace("/(tabs)/discover");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't finish onboarding. Try again.");
    } finally {
      setFinishing(false);
    }
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>Signing you in...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StepProgressBar currentStep={5} totalSteps={5} label="Highlight video" />
      <Text style={styles.title}>Add a highlight video</Text>
      <Text style={styles.body}>
        Optional — show off your game. You can always add or change this later from your
        profile.
      </Text>

      <VideoManager userId={session.user.id} />

      {error && <Text style={styles.error}>{error}</Text>}

      <WizardNav
        onBack={() => router.back()}
        loading={finishing}
        nextLabel="Finish"
        onNext={finishOnboarding}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#666", marginBottom: 20 },
  error: { fontSize: 12, color: "#d33", marginTop: 12 },
});
