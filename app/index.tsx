import { Redirect } from "expo-router";

// The bare "/" path has no route of its own — this makes it a real matched
// route (rather than Expo Router's Unmatched Route fallback) that lands in
// (tabs), which RoutingGate (app/_layout.tsx) then re-redirects from if the
// user isn't actually signed in / onboarded yet.
export default function Index() {
  return <Redirect href="/(tabs)/discover" />;
}
