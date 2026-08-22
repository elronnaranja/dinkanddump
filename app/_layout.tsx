import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthSession } from "../src/services/supabase/auth";
import { getOwnProfile } from "../src/services/supabase/profiles";

type RootGroup = "(auth)" | "(onboarding)" | "(tabs)" | null;

function useCurrentRootGroup(): RootGroup {
  const segments = useSegments();
  const first = segments[0];
  if (first === "(auth)" || first === "(onboarding)" || first === "(tabs)") {
    return first;
  }
  return null;
}

/**
 * Routing gate: waits for the auth session to resolve, then (once signed
 * in) fetches the profile's onboarding_completed flag to decide whether the
 * user belongs in (auth), (onboarding), or (tabs).
 */
function RoutingGate() {
  const router = useRouter();
  const currentGroup = useCurrentRootGroup();
  const { session, loading: sessionLoading } = useAuthSession();

  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    if (!session) {
      setOnboardingCompleted(null);
      return;
    }

    setProfileLoading(true);
    getOwnProfile(session.user.id)
      .then((profile) => {
        if (!isMounted) return;
        setOnboardingCompleted(profile?.onboarding_completed ?? false);
      })
      .catch(() => {
        if (!isMounted) return;
        // If the profile row doesn't exist yet, treat as onboarding-incomplete.
        setOnboardingCompleted(false);
      })
      .finally(() => {
        if (!isMounted) return;
        setProfileLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session) {
      if (currentGroup !== "(auth)") {
        router.replace("/(auth)/sign-in");
      }
      return;
    }

    if (profileLoading || onboardingCompleted === null) return;

    if (!onboardingCompleted) {
      if (currentGroup !== "(onboarding)") {
        router.replace("/(onboarding)/basic-profile");
      }
      return;
    }

    if (currentGroup !== "(tabs)") {
      router.replace("/(tabs)/discover");
    }
  }, [sessionLoading, session, profileLoading, onboardingCompleted, currentGroup, router]);

  const stillResolving =
    sessionLoading || (session !== null && (profileLoading || onboardingCompleted === null));

  if (stillResolving) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <RoutingGate />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
