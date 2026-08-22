import { supabase } from "./client";
import type { ConversationRow, MatchDistanceRow, MatchRow } from "../../types/database";

export async function listMatchesForUser(userId: string): Promise<MatchRow[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
    .eq("status", "active")
    .order("matched_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getMatch(matchId: string): Promise<MatchRow | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function unmatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from("matches")
    .update({ status: "unmatched" })
    .eq("id", matchId);

  if (error) throw error;
}

/**
 * Given a match row, returns the id of the *other* participant relative to
 * `userId`. Pure helper (no network call) — matches(user_1_id, user_2_id)
 * always contains exactly the two participants.
 */
export function otherParticipantId(match: MatchRow, userId: string): string {
  return match.user_1_id === userId ? match.user_2_id : match.user_1_id;
}

/**
 * The `conversations` row was created atomically alongside the match by the
 * record_swipe() RPC (see migration 0007) — this just looks it up by
 * match_id so the match celebration screen can route into it. Relies on
 * the `conversations_select_member` RLS policy, so the caller must already
 * be a participant.
 */
export async function getConversationForMatch(matchId: string): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Reverse lookup of getConversationForMatch — resolves a conversation by
 * its own id. The chat screen only has a conversationId (route param), so
 * this is how it walks back to the underlying match (see useChatHeader).
 */
export async function getConversationById(conversationId: string): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Batch version of getConversationForMatch — one round trip for the whole
 * Matches list instead of one per match. Relies on the same
 * conversations_select_member RLS policy, so only conversations the caller
 * belongs to come back (which, since matchIds should already be the
 * caller's own matches, is all of them).
 */
export async function listConversationsForMatches(matchIds: string[]): Promise<ConversationRow[]> {
  if (matchIds.length === 0) return [];

  const { data, error } = await supabase.from("conversations").select("*").in("match_id", matchIds);

  if (error) throw error;
  return data ?? [];
}

/**
 * Calls the get_match_distances RPC (migration 0013) and reshapes it into
 * a match_id -> distance_km map for easy lookup while building the Matches
 * list. See that migration for why this can't just be read off `profiles`
 * directly. The RPC takes no arguments — it always scopes to the calling
 * user via auth.uid() server-side, so there's no client-suppliable user id
 * to pass (or trust).
 */
export async function fetchMatchDistances(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("get_match_distances");

  if (error) throw error;

  const result: Record<string, number> = {};
  for (const row of (data ?? []) as MatchDistanceRow[]) {
    if (row.distance_km != null) {
      result[row.match_id] = row.distance_km;
    }
  }
  return result;
}
