import { supabase } from "./client";

export const PHOTOS_BUCKET = "photos";
export const VIDEOS_BUCKET = "videos";

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

export function getPublicPhotoUrl(path: string): string {
  return supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function getPublicVideoUrl(path: string): string {
  return supabase.storage.from(VIDEOS_BUCKET).getPublicUrl(path).data.publicUrl;
}
