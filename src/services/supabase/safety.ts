import { supabase } from "./client";
import type { ReportTargetType } from "../../types/database";

// Postgres unique_violation — thrown if the same (blocker_id, blocked_id)
// pair is inserted twice (see unique_block in 0006_blocks_reports.sql).
// Blocking someone twice should be a silent no-op, not an error.
const UNIQUE_VIOLATION = "23505";

/**
 * Blocks `blockedId` on behalf of `blockerId`.
 *
 * Two things happen, deliberately:
 *  1. Insert into `blocks`. This alone already keeps the blocked user out of
 *     future discovery — get_discovery_candidates (migration 0008) excludes
 *     any pair with a row in `blocks` in either direction.
 *  2. If the two users have an existing match, flip its status to 'blocked'
 *     (the match_status enum already has this value — migration 0004). This
 *     step matters because the `messages` RLS policies (0010) only check
 *     `matches.status = 'active'`; they never consult the `blocks` table.
 *     Without this, blocking someone you're already matched with would add
 *     them to the block list but leave the existing conversation fully
 *     messageable. Reusing 'blocked' status (rather than 'unmatched') keeps
 *     the two actions distinguishable if that's ever needed later, and
 *     matches disappear from both users' Matches lists the same way
 *     unmatching does (listMatchesForUser filters to status = 'active').
 *
 * Per spec, the blocked user is never notified — this only touches rows
 * scoped to the blocker's own actions/visibility.
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error: blockError } = await supabase
    .from("blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });

  if (blockError && blockError.code !== UNIQUE_VIOLATION) {
    throw blockError;
  }

  const { error: matchError } = await supabase
    .from("matches")
    .update({ status: "blocked" })
    .or(
      `and(user_1_id.eq.${blockerId},user_2_id.eq.${blockedId}),and(user_1_id.eq.${blockedId},user_2_id.eq.${blockerId})`
    )
    .eq("status", "active");

  if (matchError) throw matchError;
}

/**
 * Records a report. `targetId` is a profile id, photo id, video id, or
 * message id depending on `targetType` — the chat action sheet only offers
 * profile-level reporting for now (target_type: 'profile', target_id: the
 * other participant's user id).
 */
export async function reportUser(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  details?: string
): Promise<void> {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details ?? null,
  });

  if (error) throw error;
}
