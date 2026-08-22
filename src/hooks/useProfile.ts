import { useState } from "react";
import type { ProfileRow } from "../types/database";

export interface UseProfileResult {
  profile: ProfileRow | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// TODO(phase-3): implement real fetching via profiles service.
export function useProfile(_userId: string | null): UseProfileResult {
  const [profile] = useState<ProfileRow | null>(null);
  const [loading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    // TODO: call getOwnProfile
  }

  return { profile, loading, error, refresh };
}
