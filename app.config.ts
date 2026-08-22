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
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Dink & Dump uses your location to show you nearby pickleball players and calculate distance to potential matches. Your exact coordinates are never shown to other players.",
      NSCameraUsageDescription:
        "Dink & Dump needs camera access so you can take photos and videos for your player profile.",
      NSPhotoLibraryUsageDescription:
        "Dink & Dump needs photo library access so you can choose photos and videos for your player profile.",
      NSMicrophoneUsageDescription:
        "Dink & Dump needs microphone access to include audio when you record a highlight video for your profile.",
    },
  },
  android: {
    package: "design.theorange.dinkanddump",
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "CAMERA",
      "RECORD_AUDIO",
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Dink & Dump uses your location to show you nearby pickleball players and calculate distance to potential matches. Your exact coordinates are never shown to other players.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Dink & Dump needs photo library access so you can choose photos and videos for your player profile.",
        cameraPermission:
          "Dink & Dump needs camera access so you can take photos and videos for your player profile.",
        microphonePermission:
          "Dink & Dump needs microphone access to include audio when you record a highlight video for your profile.",
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: undefined,
    },
  },
});
