import { useCallback, useEffect, useState } from "react";
import type { ProfilePhotoRow, ProfileVideoRow } from "../types/database";
import { getProfileVideo, listProfilePhotos } from "../services/supabase/profiles";
import { getSignedPhotoUrls, getSignedVideoUrl } from "../services/supabase/storage";

export interface ProfilePhotoWithUrl {
  row: ProfilePhotoRow;
  url: string | null;
}

export interface UseProfileMediaResult {
  photos: ProfilePhotoWithUrl[];
  video: ProfileVideoRow | null;
  videoUrl: string | null;
  videoThumbnailUrl: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Read-only fetch of a user's photos/video with signed display URLs. */
export function useProfileMedia(userId: string | null): UseProfileMediaResult {
  const [photos, setPhotos] = useState<ProfilePhotoWithUrl[]>([]);
  const [video, setVideo] = useState<ProfileVideoRow | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setPhotos([]);
      setVideo(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [photoRows, videoRow] = await Promise.all([
        listProfilePhotos(userId),
        getProfileVideo(userId),
      ]);
      const urls = await getSignedPhotoUrls(photoRows.map((p) => p.storage_path));
      setPhotos(photoRows.map((row) => ({ row, url: urls[row.storage_path] ?? null })));

      setVideo(videoRow);
      if (videoRow) {
        const [vUrl, tUrl] = await Promise.all([
          getSignedVideoUrl(videoRow.storage_path),
          videoRow.thumbnail_path ? getSignedVideoUrl(videoRow.thumbnail_path) : null,
        ]);
        setVideoUrl(vUrl);
        setVideoThumbnailUrl(tUrl);
      } else {
        setVideoUrl(null);
        setVideoThumbnailUrl(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load profile media.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { photos, video, videoUrl, videoThumbnailUrl, loading, error, refresh };
}
