import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Local-only flag for whether the first-launch "swipe right to Dink, swipe
 * left to Dump" tutorial overlay (SwipeTutorialOverlay) has already been
 * shown. Not account/session data, so plain AsyncStorage rather than
 * expo-secure-store - same reasoning as discoveryPreferences.ts.
 */
const STORAGE_KEY = "dinkanddump.swipeTutorialSeen.v1";

export async function hasSeenSwipeTutorial(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === "true";
  } catch {
    // If storage can't be read, default to "seen" rather than risk showing
    // the tutorial on every single launch for someone with a storage issue.
    return true;
  }
}

export async function markSwipeTutorialSeen(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, "true");
}
