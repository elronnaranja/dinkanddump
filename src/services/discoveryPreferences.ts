import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DiscoveryFilters } from "../types/domain";
import { DEFAULT_DISCOVERY_FILTERS } from "../hooks/useDiscoveryQueue";

/**
 * Local persistence for the discovery preferences screen
 * (app/discovery-preferences.tsx). Filters here (max distance, skill
 * range, game/play preference) are non-sensitive user-facing settings, not
 * auth/session data — AsyncStorage is the right tool rather than
 * expo-secure-store (which client.ts already uses for the Supabase session
 * and has a hard per-value size limit that isn't worth spending on this).
 */
const STORAGE_KEY = "dinkanddump.discoveryFilters.v1";

/**
 * Narrow, defensive check that a value parsed from storage still looks like
 * a DiscoveryFilters object. Guards against a corrupted/partial value (e.g.
 * from a future app version that changes the shape) silently producing bad
 * RPC calls — falling back to defaults is always safe here.
 */
function isDiscoveryFilters(value: unknown): value is DiscoveryFilters {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.maxDistanceKm === "number" &&
    typeof v.skillMin === "string" &&
    typeof v.skillMax === "string" &&
    (v.gamePreference === null || typeof v.gamePreference === "string") &&
    (v.playPreference === null || typeof v.playPreference === "string") &&
    // genderPreference was added after this store format shipped — also
    // accept a missing key (undefined) from a value saved before that
    // change, rather than invalidating the whole cached object over one
    // new, backward-compatible field.
    (v.genderPreference === null ||
      v.genderPreference === undefined ||
      typeof v.genderPreference === "string") &&
    typeof v.limit === "number"
  );
}

/**
 * Loads persisted discovery filters, falling back to
 * DEFAULT_DISCOVERY_FILTERS if nothing has been saved yet or the saved
 * value can't be parsed/trusted.
 */
export async function loadDiscoveryFilters(): Promise<DiscoveryFilters> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DISCOVERY_FILTERS;

    const parsed: unknown = JSON.parse(raw);
    if (!isDiscoveryFilters(parsed)) return DEFAULT_DISCOVERY_FILTERS;
    // Normalize a value saved before genderPreference existed (missing key
    // -> undefined) to the real "no preference" value the rest of the app
    // expects.
    return { ...parsed, genderPreference: parsed.genderPreference ?? null };
  } catch {
    return DEFAULT_DISCOVERY_FILTERS;
  }
}

/** Persists the given discovery filters for the next app session. */
export async function saveDiscoveryFilters(filters: DiscoveryFilters): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}
