import { supabase } from "./client";
import type { DiscoveryCandidateRow } from "../../types/database";
import type { DiscoveryFilters } from "../../types/domain";

/**
 * Calls the `get_discovery_candidates` Postgres RPC (see
 * supabase/migrations/0008_discovery_candidates_function.sql), which
 * already excludes the caller, already-swiped users (either direction),
 * and blocked users, and never returns raw lat/long. Distance/skill/game
 * filtering happens server-side.
 */
export async function fetchDiscoveryCandidates(
  userId: string,
  filters: DiscoveryFilters
): Promise<DiscoveryCandidateRow[]> {
  const { data, error } = await supabase.rpc("get_discovery_candidates", {
    p_user_id: userId,
    p_max_distance_km: filters.maxDistanceKm,
    p_skill_min: filters.skillMin,
    p_skill_max: filters.skillMax,
    p_game_pref: filters.gamePreference,
    p_play_pref: filters.playPreference,
    p_limit: filters.limit,
  });

  if (error) throw error;
  return data ?? [];
}
