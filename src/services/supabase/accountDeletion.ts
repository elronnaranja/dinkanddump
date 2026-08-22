import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./client";

const GENERIC_ERROR = "Couldn't delete your account. Please try again.";

/**
 * Permanently deletes the signed-in user's account by invoking the
 * `delete-account` Supabase Edge Function (supabase/functions/delete-account
 * /index.ts). That function runs server-side with the service_role key to
 * remove Storage objects and the auth.users row — this app's client never
 * has and never uses the service_role key, so account deletion cannot
 * happen directly from here. supabase.functions.invoke automatically
 * attaches the caller's own access token, and the Edge Function derives
 * which account to delete from that token server-side (never from a
 * client-supplied id), so this can only ever delete the caller's own
 * account.
 *
 * Throws on any failure — including a non-2xx response from the function —
 * so callers must not treat this as having succeeded, and specifically
 * must not sign the user out locally / route to sign-in, unless this
 * resolves without throwing (see app/(tabs)/profile/settings.tsx).
 */
export async function deleteOwnAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
  });

  if (error) {
    // FunctionsHttpError's own .message is just a generic "non-2xx status
    // code" string — the Edge Function's actual { ok: false, error } body
    // is on the raw Response at error.context, so unwrap that for a
    // message worth showing the user.
    if (error instanceof FunctionsHttpError) {
      const body: { error?: string } | null = await error.context.json().catch(() => null);
      throw new Error(body?.error || GENERIC_ERROR);
    }
    throw new Error(error.message || GENERIC_ERROR);
  }

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    throw new Error(result?.error || GENERIC_ERROR);
  }
}
