import { Stack } from "expo-router";

// Groups index + [conversationId] under the single "Messages" tab declared
// in app/(tabs)/_layout.tsx. Without this, Expo Router has no single
// "messages" route to bind that Tabs.Screen to, and each file here leaks
// out as its own top-level tab instead.
export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[conversationId]" />
    </Stack>
  );
}
