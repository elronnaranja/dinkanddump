import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./client";

export interface ModerationResult {
  approved: boolean;
  /** Present when approved is false — the reason to show the user. */
  reason?: string;
}

/**
 * Runs an already-uploaded photo (see storage.ts#uploadPhoto) through the
 * moderate-photo Edge Function before it's attached to a profile. Must be
 * called after the upload and before insertProfilePhoto() — on rejection,
 * the caller is responsible for deleting the just-uploaded storage object
 * (see PhotoManager's pickAndUpload) rather than ever inserting a
 * profile_photos row for it.
 *
 * Throws only on an actual failure to run the check (network error, server
 * misconfiguration) — a rejected photo is a normal, successful result with
 * `approved: false`, not an exception.
 */
export async function moderatePhoto(storagePath: string): Promise<ModerationResult> {
  const { data, error } = await supabase.functions.invoke("moderate-photo", {
    body: { storagePath },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body: { error?: string } | null = await error.context.json().catch(() => null);
      throw new Error(body?.error || "Couldn't check this photo right now. Please try again.");
    }
    throw new Error(error.message || "Couldn't check this photo right now. Please try again.");
  }

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    return { approved: false, reason: result?.error || "This photo was rejected. Please choose a different photo." };
  }
  return { approved: true };
}
