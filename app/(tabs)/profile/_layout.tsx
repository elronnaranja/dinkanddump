import { Stack } from "expo-router";

// Groups index/edit/settings under the single "Profile" tab declared in
// app/(tabs)/_layout.tsx — see the identical comment in messages/_layout.tsx
// for why this is required, not optional.
export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
