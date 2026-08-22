import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="basic-profile" />
      <Stack.Screen name="location" />
      <Stack.Screen name="pickleball-profile" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="video" />
    </Stack>
  );
}
