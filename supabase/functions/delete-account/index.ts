// supabase/functions/delete-account/index.ts
//
// Permanently deletes the authenticated caller's own account. Invoked from
// the app via `supabase.functions.invoke("delete-account")` (see
// src/services/supabase/accountDeletion.ts) — the account to delete is
// always derived from the caller's own JWT (attached automatically by the
// client SDK), never from a client-suppliable id, so a user can only ever
// delete themselves.
//
// This function is the ONLY place in the system that touches the
// service_role key. SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are provisioned automatically as secrets for
// every Supabase Edge Function — they are read from Deno.env here and are
// never bundled into the client app (src/services/supabase/client.ts only
// ever uses the anon key). Do not add SUPABASE_SERVICE_ROLE_KEY to the
// app's .env or app.config.ts.
//
// Deletion sequence:
//   1. Best-effort removal of the user's Storage objects (photos + videos
//      buckets, under the `{user_id}/` prefix — see
//      supabase/migrations/0011_storage_buckets.sql for that path
//      convention). Storage objects are NOT part of the Postgres FK graph,
//      so nothing else here removes them; this step is what does.
//   2. `auth.admin.deleteUser(userId)`, which cascades through the entire
//      FK chain rooted at `profiles.id references auth.users(id) on delete
//      cascade` (supabase/migrations/0002_profiles.sql): profiles ->
//      profile_photos, profile_videos, swipes, matches, conversations,
//      conversation_members, messages, blocks. See the design note below
//      for what this means for the *other* party in a match/conversation.
//
// --- Design decision: matches/messages left behind after deletion ---
// matches.user_1_id/user_2_id, conversations.match_id, and
// messages.sender_id/conversation_id are all `on delete cascade`
// (migrations 0004, 0005). So deleting a profile deletes that user's
// matches — and the conversations/messages inside them — *entirely*, for
// both parties, rather than leaving an orphaned or anonymized row behind.
// Chosen over anonymizing (e.g. nulling sender_id, keeping messages under a
// "deleted user" placeholder) because:
//   - It costs zero schema changes: the FK cascade chain already set up in
//     migrations 0002-0006 does exactly this for free.
//   - Anonymizing would mean weakening messages.sender_id / matches' FKs to
//     `on delete set null` and reworking every RLS policy/query that
//     currently assumes a live `profiles` row on the other end of those
//     joins (e.g. messages_select_active_conversation_member in
//     0010_rls_policies.sql, and useMatches' profile-enrichment queries) —
//     a much larger, riskier surface to take on for a V1 account-deletion
//     flow.
//   - It trivially satisfies "sender identity shouldn't resolve to a live
//     account": there's no row left to resolve at all.
// The tradeoff: the surviving match partner loses that conversation's
// history outright instead of seeing a "Deleted user" placeholder message
// thread. That's judged acceptable V1 behavior for a swipe app — it's the
// same outcome the surviving party already sees today after an unmatch or
// block (see src/services/supabase/matches.ts#unmatch and
// src/services/supabase/safety.ts#blockUser, both of which just stop
// surfacing the match rather than preserving history) — and can be
// revisited later with a soft-delete/anonymize migration if product wants
// richer behavior.
//
// `reports` rows are untouched by this function: reports.target_id has no
// FK constraint (0006_blocks_reports.sql), so reports *about* this user
// survive for moderation history even after the account is gone.
// reports.reporter_id DOES cascade, so reports *filed by* this user are
// removed with them automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const PHOTOS_BUCKET = "photos";
const VIDEOS_BUCKET = "videos";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/**
 * Best-effort delete of every object under `{userId}/` in one bucket.
 * Logs and returns rather than throwing on failure — a Storage hiccup
 * shouldn't block the actual account deletion (step 2), which is the part
 * that matters most for "did the account actually get deleted".
 */
async function removeAllObjectsUnderPrefix(
  // deno-lint-ignore no-explicit-any
  admin: any,
  bucket: string,
  userId: string
): Promise<void> {
  const { data: files, error: listError } = await admin.storage
    .from(bucket)
    .list(userId, { limit: 1000 });

  if (listError) {
    console.error(`delete-account: failed to list ${bucket}/${userId}:`, listError.message);
    return;
  }
  if (!files || files.length === 0) return;

  const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
  const { error: removeError } = await admin.storage.from(bucket).remove(paths);
  if (removeError) {
    console.error(
      `delete-account: failed to remove ${paths.length} object(s) from ${bucket}/${userId}:`,
      removeError.message
    );
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error(
      "delete-account: missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY env"
    );
    return jsonResponse(
      { ok: false, error: "Server misconfiguration. Please try again later." },
      500
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ ok: false, error: "Not authenticated." }, 401);
  }

  // Scoped to the CALLER's own JWT — used only to resolve who is making
  // this request. Never used for privileged operations.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ ok: false, error: "Not authenticated." }, 401);
  }

  const userId = user.id;

  // Privileged client — service_role, server-side only. Used only from
  // here on, and only against the account we just verified the caller
  // owns (userId came from the caller's own verified JWT above, never from
  // the request body).
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await Promise.all([
    removeAllObjectsUnderPrefix(adminClient, PHOTOS_BUCKET, userId),
    removeAllObjectsUnderPrefix(adminClient, VIDEOS_BUCKET, userId),
  ]);

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error("delete-account: auth.admin.deleteUser failed:", deleteError.message);
    return jsonResponse(
      { ok: false, error: "Couldn't delete your account. Please try again." },
      500
    );
  }

  return jsonResponse({ ok: true }, 200);
});
