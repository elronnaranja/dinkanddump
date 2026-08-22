import { useCallback, useEffect, useState } from "react";
import type { ProfileRow } from "../types/database";
import { getOwnProfile } from "../services/supabase/profiles";

export interface UseProfileResult {
  profile: ProfileRow | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProfile(userId: string | null): UseProfileResult {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const row = await getOwnProfile(userId);
      setProfile(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load profile.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, loading, error, refresh };
}
