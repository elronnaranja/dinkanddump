/**
 * Basic helpers for constructing/parsing storage paths for profile media.
 * Actual upload/compression pipelines are implemented in a later phase.
 */

export function buildPhotoFileName(position: number, extension = "jpg"): string {
  return `photo-${position}-${Date.now()}.${extension}`;
}

export function buildVideoFileName(extension = "mp4"): string {
  return `video-${Date.now()}.${extension}`;
}

export function getFileExtension(uri: string): string {
  const parts = uri.split(".");
  return parts.length > 1 ? (parts[parts.length - 1] ?? "").toLowerCase() : "";
}

// TODO(phase-3): add image resize/compression via expo-image-manipulator
// and video thumbnail generation before upload.
