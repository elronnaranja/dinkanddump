import { useCallback, useEffect, useRef, useState } from "react";
import type { DiscoveryCandidate, DiscoveryFilters } from "../types/domain";
import { mapDiscoveryCandidateRow, mergePublicProfileIntoCandidate } from "../types/domain";
import { fetchDiscoveryCandidates } from "../services/supabase/discovery";
import { listPublicProfiles } from "../services/supabase/profiles";
import { getSignedPhotoUrls } from "../services/supabase/storage";

// Refetch a fresh page once the local queue drops to this many remaining
// candidates, so the deck never visibly runs dry while the next page loads.
const LOW_WATER_MARK = 4;

// Sensible defaults that surface a broad set of nearby players, used both
// as the hook's fallback param and as the discovery-preferences screen's
// (app/discovery-preferences.tsx) fallback when nothing has been persisted
// yet — see src/services/discoveryPreferences.ts.
export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  maxDistanceKm: 50,
  skillMin: "1.0",
  skillMax: "5.5+",
  gamePreference: null,
  playPreference: null,
  limit: 20,
};

export interface UseDiscoveryQueueResult {
  candidates: DiscoveryCandidate[];
  loading: boolean;
  error: string | null;
  /** True once a fetch has come back with zero fresh candidates. */
  exhausted: boolean;
  refresh: () => Promise<void>;
  /** Removes a candidate from the front of the queue after a swipe resolves. */
  consumeCandidate: (id: string) => void;
  /** Puts a candidate back at the front — used to recover from a failed swipe. */
  restoreCandidate: (candidate: DiscoveryCandidate) => void;
}

export function useDiscoveryQueue(
  userId: string | null,
  filters: DiscoveryFilters = DEFAULT_DISCOVERY_FILTERS
): UseDiscoveryQueueResult {
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState<boolean>(false);

  const fetchingRef = useRef(false);
  // Ids already placed in the local queue. The RPC excludes already-*swiped*
  // users, but a candidate sitting unswiped in our local queue would still
  // come back from a second page fetch — this dedupes across pages.
  const seenIdsRef = useRef<Set<string>>(new Set());

  const loadPage = useCallback(
    async (replace: boolean) => {
      if (!userId || fetchingRef.current) return;
      fetchingRef.current = true;
      if (replace) setLoading(true);
      setError(null);

      try {
        const rows = await fetchDiscoveryCandidates(filters);
        const freshRows = rows.filter((row) => !seenIdsRef.current.has(row.id));

        const [publicProfiles, photoUrls] = await Promise.all([
          listPublicProfiles(freshRows.map((row) => row.id)),
          getSignedPhotoUrls(
            freshRows
              .map((row) => row.primary_photo_path)
              .filter((path): path is string => !!path)
          ),
        ]);
        const profileById = new Map(publicProfiles.map((p) => [p.id, p]));

        const enriched = freshRows.map((row) => {
          const base = mapDiscoveryCandidateRow(row, (path) =>
            path ? photoUrls[path] ?? null : null
          );
          return mergePublicProfileIntoCandidate(base, profileById.get(row.id));
        });

        enriched.forEach((c) => seenIdsRef.current.add(c.id));
        setCandidates((prev) => (replace ? enriched : [...prev, ...enriched]));
        // Exhaustion reflects what the RPC itself returned, not local
        // dedupe — if the server still has candidates but they're all
        // already queued locally, there's simply nothing to top up yet.
        setExhausted(rows.length === 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load players nearby.");
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    [userId, filters]
  );

  const refresh = useCallback(async () => {
    seenIdsRef.current = new Set();
    setExhausted(false);
    await loadPage(true);
  }, [loadPage]);

  useEffect(() => {
    if (userId) {
      refresh();
    } else {
      setCandidates([]);
      setError(null);
      setExhausted(false);
      setLoading(false);
    }
    // Only re-run when the user identity changes — `refresh` itself is
    // stable enough for this purpose and re-including it here would refire
    // on every filters-derived rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId || exhausted) return;
    if (candidates.length > 0 && candidates.length <= LOW_WATER_MARK) {
      loadPage(false);
    }
  }, [candidates.length, exhausted, userId, loadPage]);

  const consumeCandidate = useCallback((id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const restoreCandidate = useCallback((candidate: DiscoveryCandidate) => {
    setCandidates((prev) => [candidate, ...prev.filter((c) => c.id !== candidate.id)]);
  }, []);

  return { candidates, loading, error, exhausted, refresh, consumeCandidate, restoreCandidate };
}
