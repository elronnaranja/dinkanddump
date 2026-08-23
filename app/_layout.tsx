import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthSession } from "../src/services/supabase/auth";
import { getOwnProfile } from "../src/services/supabase/profiles";

// Only (auth) and (onboarding) are gated groups a signed-in, onboarded user
// must never be left in. Everything else — (tabs), and root-level modal
// routes like /match/[matchId] and /discovery-preferences that intentionally
// live outside the tab layout — is legitimate app content once authenticated
// and onboarded, and must NOT be force-redirected to Discover. An earlier
// version of this gate treated "not literally inside (tabs)" as "redirect to
// Discover", which meant every push to /match/[matchId] or
// /discovery-preferences was immediately reverted before it could render.
type GatedGroup = "(auth)" | "(onboarding)" | null;

function useCurrentGatedGroup(): GatedGroup {
  const segments = useSegments();
  const first = segments[0];
  if (first === "(auth)" || first === "(onboarding)") {
    return first;
  }
  return null;
}

/**
 * Routing gate: waits for the auth session to resolve, then (once signed
 * in) fetches the profile's onboarding_completed flag to decide whether the
 * user belongs in (auth) or (onboarding). Once both checks pass, the gate
 * steps aside — it does not pin the user to (tabs) specifically, since
 * legitimate root-level routes like /match/[matchId] and
 * /discovery-preferences live outside that group too.
 */
function RoutingGate() {
  const router = useRouter();
  const currentGroup = useCurrentGatedGroup();
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

    // Authenticated and onboarded: only redirect away from leftover
    // (auth)/(onboarding) routes. Anything else — (tabs), or a root-level
    // modal route like /match/[matchId] or /discovery-preferences — is
    // legitimate content the user navigated to on purpose and must be left
    // alone.
    if (currentGroup === "(auth)" || currentGroup === "(onboarding)") {
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
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RoutingGate />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
