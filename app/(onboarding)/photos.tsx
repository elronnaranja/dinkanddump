import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { StepProgressBar } from "../../src/components/ui/StepProgressBar";
import { WizardNav } from "../../src/components/ui/WizardNav";
import { PhotoManager } from "../../src/components/profile/PhotoManager";
import { useOnboarding } from "../../src/context/OnboardingContext";
import { useAuthSession } from "../../src/services/supabase/auth";
import { useProfile } from "../../src/hooks/useProfile";

export default function PhotosScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const { profileCreated } = useOnboarding();
  const [photoCount, setPhotoCount] = useState(0);
  const { profile } = useProfile(session?.user.id ?? null);

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>Signing you in...</Text>
      </View>
    );
  }

  if (!profileCreated) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>
          Please complete the previous steps first.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StepProgressBar currentStep={4} totalSteps={5} label="Photos" />
      <Text style={styles.title}>Add photos</Text>
      <Text style={styles.body}>
        Add at least 1 photo (up to 5) so other players can recognize you. Your first photo
        is your primary photo.
      </Text>

      <PhotoManager
        userId={session.user.id}
        emailVerified={!!profile?.email_verified}
        onCountChange={setPhotoCount}
      />

      <WizardNav
        onBack={() => router.back()}
        nextDisabled={photoCount < 1}
        onNext={() => router.push("/(onboarding)/video")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, color: "#666", marginBottom: 20 },
});
