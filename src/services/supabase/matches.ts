import { supabase } from "./client";
import type { MatchRow } from "../../types/database";

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
