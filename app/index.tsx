import { ActivityIndicator, StyleSheet, View } from "react-native";

// The bare "/" path has no route of its own — this exists purely to make it
// a real matched route (rather than Expo Router's Unmatched Route
// fallback), not to decide where the user actually belongs. It must NOT
// navigate on its own: an earlier version rendered `<Redirect
// href="/(tabs)/discover" />` here, which raced against RoutingGate's
// (app/_layout.tsx) own auth-aware redirect — both fire a router.replace()
// at nearly the same moment on mount, and on a real device the two
// resolved in the opposite order from what web preview testing showed,
// landing a signed-out user on Discover instead of Sign In. RoutingGate
// treats "/" as its own gated case (see useCurrentGatedGroup) and is now
// the only thing that ever calls router.replace(), so this just renders a
// brief loading state while that resolves.
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
