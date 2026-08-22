import { supabase } from "./client";
import type {
  ProfilePhotoRow,
  ProfileRow,
  ProfileVideoRow,
  PublicProfileRow,
} from "../../types/database";

export async function getOwnProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPublicProfile(userId: string): Promise<PublicProfileRow | null> {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Batch fetch of public_profiles rows for a set of user ids — used to
 * enrich discovery candidates (which the get_discovery_candidates RPC
 * returns with only a subset of fields) with game/play preference, bio,
 * DUPR, etc. in a single round trip.
 */
export async function listPublicProfiles(userIds: string[]): Promise<PublicProfileRow[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase.from("public_profiles").select("*").in("id", userIds);

  if (error) throw error;
  return data ?? [];
}

export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at" | "location">;

export async function upsertProfile(profile: ProfileInsert): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export type ProfileUpdate = Partial<
  Omit<ProfileRow, "id" | "created_at" | "updated_at" | "location">
>;

export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function setOnboardingCompleted(userId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: completed })
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Returns true if `username` is not already taken by another profile.
 * `excludeUserId` lets the current user "collide" with their own existing
 * row without being blocked (used on the edit screen).
 */
export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  let query = supabase
    .from("profiles")
    .select("id")
    .ilike("username", username);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) === 0;
}

// --- Profile photos -------------------------------------------------------

export async function listProfilePhotos(userId: string): Promise<ProfilePhotoRow[]> {
  const { data, error } = await supabase
    .from("profile_photos")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function insertProfilePhoto(
  userId: string,
  storagePath: string,
  position: number
): Promise<ProfilePhotoRow> {
  const { data, error } = await supabase
    .from("profile_photos")
    .insert({ user_id: userId, storage_path: storagePath, position })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProfilePhoto(photoId: string): Promise<void> {
  const { error } = await supabase.from("profile_photos").delete().eq("id", photoId);
  if (error) throw error;
}

export async function updateProfilePhotoPosition(
  photoId: string,
  position: number
): Promise<void> {
  const { error } = await supabase
    .from("profile_photos")
    .update({ position })
    .eq("id", photoId);
  if (error) throw error;
}

/**
 * Persists a full reordering of a user's photos. Positions are unique per
 * user (see migration 0003), so this shifts everything to temporary
 * negative positions first to avoid unique constraint collisions mid-update.
 */
export async function reorderProfilePhotos(
  photos: { id: string; position: number }[]
): Promise<void> {
  for (const [index, photo] of photos.entries()) {
    const { error } = await supabase
      .from("profile_photos")
      .update({ position: -1 - index })
      .eq("id", photo.id);
    if (error) throw error;
  }
  for (const photo of photos) {
    const { error } = await supabase
      .from("profile_photos")
      .update({ position: photo.position })
      .eq("id", photo.id);
    if (error) throw error;
  }
}

// --- Profile video ----------------------------------------------------

export async function getProfileVideo(userId: string): Promise<ProfileVideoRow | null> {
  const { data, error } = await supabase
    .from("profile_videos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertProfileVideo(
  userId: string,
  storagePath: string,
  thumbnailPath: string | null,
  duration: number | null
): Promise<ProfileVideoRow> {
  const { data, error } = await supabase
    .from("profile_videos")
    .insert({
      user_id: userId,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      duration,
      status: "active",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProfileVideo(videoId: string): Promise<void> {
  const { error } = await supabase.from("profile_videos").delete().eq("id", videoId);
  if (error) throw error;
}
