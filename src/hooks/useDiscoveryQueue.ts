import { useState } from "react";
import type { DiscoveryCandidate, DiscoveryFilters } from "../types/domain";

export interface UseDiscoveryQueueResult {
  candidates: DiscoveryCandidate[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// TODO(phase-3): implement real fetching via get_discovery_candidates RPC,
// pagination, and local queue management (swipe consumes from the front).
export function useDiscoveryQueue(_filters: DiscoveryFilters): UseDiscoveryQueueResult {
  const [candidates] = useState<DiscoveryCandidate[]>([]);
  const [loading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    // TODO: call supabase.rpc('get_discovery_candidates', ...)
  }

  return { candidates, loading, error, refresh };
}
