import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import type { Database } from "../../types/database";

/**
 * expo-secure-store does not implement the AsyncStorage interface Supabase's
 * auth client expects (getItem/setItem/removeItem returning promises), and
 * it has a hard per-value size limit (2048 bytes on iOS Keychain). Supabase
 * session payloads (access + refresh token + user metadata) are normally
 * well under that limit, but if you extend the session/user metadata a lot
 * this adapter may need to switch to chunking or fall back to
 * expo-file-system/AsyncStorage for larger payloads.
 *
 * expo-secure-store has no web implementation (its methods throw there), so
 * this app's primary target — iOS/Android — uses SecureStore, while a web
 * build (e.g. local dev preview) falls back to localStorage. Session tokens
 * in localStorage are only as safe as the browser environment they run in,
 * which is an accepted tradeoff for a web preview of a mobile-first app,
 * not a hardened web deployment.
 */
const secureStoreAdapter: SupportedStorage =
  Platform.OS === "web"
    ? {
        getItem: (key: string) =>
          Promise.resolve(typeof localStorage !== "undefined" ? localStorage.getItem(key) : null),
        setItem: (key: string, value: string) => {
          if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          if (typeof localStorage !== "undefined") localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

function readEnv(name: "supabaseUrl" | "supabaseAnonKey", processEnvKey: string): string {
  const fromProcessEnv = process.env[processEnvKey];
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = extra?.[name];

  const value = fromProcessEnv ?? (typeof fromExtra === "string" ? fromExtra : undefined);

  if (!value) {
    throw new Error(
      `Missing required Supabase config: ${processEnvKey}. Set it in your .env file ` +
        `(see .env.example) — never hardcode Supabase credentials in source.`
    );
  }

  return value;
}

const supabaseUrl = readEnv("supabaseUrl", "EXPO_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = readEnv("supabaseAnonKey", "EXPO_PUBLIC_SUPABASE_ANON_KEY");

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
