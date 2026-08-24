import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthSession } from "../src/services/supabase/auth";
import { getOwnProfile } from "../src/services/supabase/profiles";

// Only (auth), (onboarding), and the bare "/" index route are gated cases
// this gate ever redirects away from. Everything else — (tabs), and
// root-level modal routes like /match/[matchId] and /discovery-preferences
// that intentionally live outside the tab layout — is legitimate app
// content once authenticated and onboarded, and must NOT be
// force-redirected to Discover. An earlier version of this gate treated
// "not literally inside (tabs)" as "redirect to Discover", which broke
// those modal routes; a later version left "/" folded into the same
// "leave alone" bucket as (tabs), which meant nothing here ever navigated
// a user off of "/" except app/index.tsx's own competing redirect — a
// race that resolved differently on a real device than in web testing,
// occasionally landing a signed-out user on Discover instead of Sign In.
// Tracking "/" as its own case makes RoutingGate the only thing that ever
// calls router.replace(), so there's no race left to lose.
type GatedGroup = "(auth)" | "(onboarding)" | "index" | null;

function useCurrentGatedGroup(): GatedGroup {
  const segments = useSegments();
  const first = segments[0];
  if (first === "(auth)" || first === "(onboarding)") {
    return first;
  }
  // The bare "/" route has no group segment at all — checking `!first`
  // rather than `segments.length === 0` here since this expo-router
  // version's typed useSegments() return type doesn't allow narrowing on
  // an empty-array length directly.
  if (!first) {
    return "index";
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
    // (auth)/(onboarding) routes, or the bare "/" index route on a cold
    // start. Anything else — (tabs), or a root-level modal route like
    // /match/[matchId] or /discovery-preferences — is legitimate content
    // the user navigated to on purpose and must be left alone.
    if (currentGroup === "(auth)" || currentGroup === "(onboarding)" || currentGroup === "index") {
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
