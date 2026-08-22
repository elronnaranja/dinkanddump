import { useState } from "react";
import type { MatchSummary } from "../types/domain";

export interface UseMatchesResult {
  matches: MatchSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// TODO(phase-3): implement real fetching via matches service + realtime updates.
export function useMatches(_userId: string | null): UseMatchesResult {
  const [matches] = useState<MatchSummary[]>([]);
  const [loading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    // TODO: call listMatchesForUser
  }

  return { matches, loading, error, refresh };
}
