import type { ExpoConfig, ConfigContext } from "expo/config";

// EXPO_PUBLIC_* env vars are inlined by Expo automatically at build time.
// We also mirror them into `extra` so they can be read via expo-constants
// as a fallback in environments where process.env inlining isn't available
// (e.g. certain native/OTA update contexts).
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Dink & Dump",
  slug: "dink-and-dump",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "dinkanddump",
  userInterfaceStyle: "automatic",
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "design.theorange.dinkanddump",
  },
  android: {
    package: "design.theorange.dinkanddump",
  },
  plugins: ["expo-router", "expo-secure-store", "expo-location"],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: undefined,
    },
  },
});
