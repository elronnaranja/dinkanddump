import { Stack } from "expo-router";
import { OnboardingProvider } from "../../src/context/OnboardingContext";

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="basic-profile" />
        <Stack.Screen name="location" />
        <Stack.Screen name="pickleball-profile" />
        <Stack.Screen name="photos" />
        <Stack.Screen name="video" />
      </Stack>
    </OnboardingProvider>
  );
}
