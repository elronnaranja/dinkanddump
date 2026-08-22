import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";

export interface AuthResult {
  error: string | null;
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

export async function resetPassword(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { error: error?.message ?? null };
}

export interface AuthSessionState {
  session: Session | null;
  loading: boolean;
}

/**
 * Subscribes to Supabase auth state changes and exposes the current
 * session plus a loading flag for the initial session resolution.
 */
export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch((error: unknown) => {
        // A storage-layer failure here (e.g. Keychain/SecureStore access
        // denied) must not leave the app stuck on a loading spinner forever
        // with no way to recover — fall back to "signed out" so the user
        // can at least reach the sign-in screen and retry.
        console.error("Failed to load auth session:", error);
        if (!isMounted) return;
        setSession(null);
        setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
