import { supabase } from "./client";
import type { ConversationRow, MatchRow } from "../../types/database";

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
