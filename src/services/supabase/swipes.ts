import { supabase } from "./client";
import type { RecordSwipeResult } from "../../types/database";
import type { MatchResult } from "../../types/domain";

export type SwipeActionInput = "dink" | "dump";

/**
 * Calls the `record_swipe` Postgres RPC (see supabase/migrations) which
 * atomically upserts the swipe, checks for a reciprocal "dink", and creates
 * a match + conversation if one occurred. Race-safety for simultaneous
 * dinks is handled server-side.
 */
export async function recordSwipe(
  toUserId: string,
  action: SwipeActionInput
): Promise<MatchResult> {
  const { data, error } = await supabase.rpc("record_swipe", {
    p_to_user_id: toUserId,
    p_action: action,
  });

  if (error) throw error;

  const result = data as unknown as RecordSwipeResult;
  return { matched: result.matched, matchId: result.match_id };
}
