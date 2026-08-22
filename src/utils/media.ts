/**
 * Basic helpers for constructing/parsing storage paths for profile media,
 * plus image compression used by the onboarding/profile-edit photo and
 * video pipelines.
 */
import * as ImageManipulator from "expo-image-manipulator";
import * as Crypto from "expo-crypto";
import { Image } from "react-native";

export const MAX_PHOTOS = 5;
export const MAX_VIDEO_DURATION_SECONDS = 30;
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB, matches videos bucket limit
export const MAX_IMAGE_DIMENSION = 1080;

function randomId(): string {
  // expo-crypto's randomUUID is synchronous and available on-device.
  return Crypto.randomUUID();
}

export function buildPhotoFileName(extension = "jpg"): string {
  return `${randomId()}.${extension}`;
}

export function buildVideoFileName(extension = "mp4"): string {
  return `${randomId()}.${extension}`;
}

export function buildVideoThumbnailFileName(): string {
  return `${randomId()}_thumb.jpg`;
}

export function getFileExtension(uri: string): string {
  const parts = uri.split(".");
  return parts.length > 1 ? (parts[parts.length - 1] ?? "").toLowerCase() : "";
}

/**
 * Resizes an image so its longest dimension is at most MAX_IMAGE_DIMENSION
 * and re-encodes it as JPEG at a reasonable quality, returning the new
 * local file URI.
 */
function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

export async function compressImage(uri: string): Promise<string> {
  let resize: { width?: number; height?: number } = { width: MAX_IMAGE_DIMENSION };
  try {
    const { width, height } = await getImageSize(uri);
    if (height > width) {
      resize = { height: MAX_IMAGE_DIMENSION };
    }
    if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
      resize = {};
    }
  } catch {
    // Fall back to width-based resize if we can't read dimensions.
  }

  const actions = Object.keys(resize).length > 0 ? [{ resize }] : [];
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}
