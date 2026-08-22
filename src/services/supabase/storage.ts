import { supabase } from "./client";

export const PHOTOS_BUCKET = "photos";
export const VIDEOS_BUCKET = "videos";

// Buckets are private (see supabase/migrations/0011_storage_buckets.sql), so
// media is never served from a public bucket URL. Callers must request a
// signed URL for display.
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export async function uploadPhoto(
  userId: string,
  fileUri: string,
  fileName: string,
  contentType = "image/jpeg"
): Promise<string> {
  const path = `${userId}/${fileName}`;
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, blob, {
    contentType,
    upsert: true,
  });

  if (error) throw error;
  return path;
}

export async function uploadVideo(
  userId: string,
  fileUri: string,
  fileName: string,
  contentType = "video/mp4"
): Promise<string> {
  const path = `${userId}/${fileName}`;
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(VIDEOS_BUCKET).upload(path, blob, {
    contentType,
    upsert: true,
  });

  if (error) throw error;
  return path;
}

export async function deletePhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
  if (error) throw error;
}

export async function deleteVideo(path: string): Promise<void> {
  const { error } = await supabase.storage.from(VIDEOS_BUCKET).remove([path]);
  if (error) throw error;
}

export async function getSignedPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

export async function getSignedVideoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(VIDEOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

export async function getSignedPhotoUrls(
  paths: string[]
): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    paths.map(async (path) => [path, await getSignedPhotoUrl(path)] as const)
  );
  return Object.fromEntries(entries);
}
