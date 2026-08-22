import { useCallback, useEffect, useState } from "react";
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as FileSystem from "expo-file-system";
import type { ProfileVideoRow } from "../../types/database";
import {
  deleteProfileVideo,
  getProfileVideo,
  insertProfileVideo,
} from "../../services/supabase/profiles";
import {
  deleteVideo as deleteStorageVideo,
  getSignedVideoUrl,
  uploadPhoto,
  uploadVideo,
} from "../../services/supabase/storage";
import {
  buildVideoFileName,
  buildVideoThumbnailFileName,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
} from "../../utils/media";

interface VideoManagerProps {
  userId: string;
  onVideoChange?: (hasVideo: boolean) => void;
}

export function VideoManager({ userId, onVideoChange }: VideoManagerProps) {
  const [video, setVideo] = useState<ProfileVideoRow | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getProfileVideo(userId);
      setVideo(row);
      onVideoChange?.(!!row);
      if (row?.thumbnail_path) {
        const url = await getSignedVideoUrl(row.thumbnail_path);
        setThumbnailUrl(url);
      } else {
        setThumbnailUrl(null);
      }
    } catch {
      setError("Couldn't load your video.");
    } finally {
      setLoading(false);
    }
  }, [userId, onVideoChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function pickAndUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo/video access needed",
        "Enable photo library access in Settings to add a highlight video."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setError(null);

    const durationSeconds = asset.duration ? asset.duration / 1000 : null;
    if (durationSeconds !== null && durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
      Alert.alert(
        "Video too long",
        `Highlight videos must be ${MAX_VIDEO_DURATION_SECONDS} seconds or shorter. ` +
          "Please trim your video and try again."
      );
      return;
    }

    try {
      const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
      const size = info.exists ? info.size : undefined;
      if (size && size > MAX_VIDEO_SIZE_BYTES) {
        Alert.alert(
          "Video too large",
          `Highlight videos must be under ${Math.round(
            MAX_VIDEO_SIZE_BYTES / (1024 * 1024)
          )}MB. Please choose a smaller file.`
        );
        return;
      }
    } catch {
      // If we can't stat the file, let the upload proceed and rely on the
      // storage bucket's own file_size_limit as a backstop.
    }

    setUploading(true);
    try {
      // Replace any existing video first.
      if (video) {
        await deleteStorageVideo(video.storage_path).catch(() => undefined);
        if (video.thumbnail_path) {
          await deleteStorageVideo(video.thumbnail_path).catch(() => undefined);
        }
        await deleteProfileVideo(video.id);
      }

      const videoFileName = buildVideoFileName("mp4");
      const videoPath = await uploadVideo(userId, asset.uri, videoFileName);

      let thumbnailPath: string | null = null;
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
          time: 500,
        });
        const thumbFileName = buildVideoThumbnailFileName();
        thumbnailPath = await uploadPhoto(userId, thumbUri, thumbFileName, "image/jpeg");
      } catch {
        // Thumbnail generation failing shouldn't block the video upload.
      }

      await insertProfileVideo(userId, videoPath, thumbnailPath, durationSeconds);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!video) return;
    setUploading(true);
    setError(null);
    try {
      await deleteStorageVideo(video.storage_path).catch(() => undefined);
      if (video.thumbnail_path) {
        await deleteStorageVideo(video.thumbnail_path).catch(() => undefined);
      }
      await deleteProfileVideo(video.id);
      await load();
    } catch {
      setError("Couldn't remove the video.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ marginVertical: 24 }} />;
  }

  return (
    <View>
      {error && <Text style={styles.error}>{error}</Text>}

      {video ? (
        <View style={styles.videoBox}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Text style={styles.thumbnailPlaceholderText}>Video</Text>
            </View>
          )}
          {uploading && (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          <View style={styles.videoActions}>
            <Pressable onPress={pickAndUpload} style={styles.actionButton} disabled={uploading}>
              <Text style={styles.actionText}>Replace</Text>
            </Pressable>
            <Pressable onPress={handleDelete} style={styles.actionButton} disabled={uploading}>
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.addBox} onPress={pickAndUpload} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.addText}>+ Add a highlight video (optional)</Text>
          )}
        </Pressable>
      )}

      <Text style={styles.hint}>
        Max {MAX_VIDEO_DURATION_SECONDS}s, up to{" "}
        {Math.round(MAX_VIDEO_SIZE_BYTES / (1024 * 1024))}MB.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  addBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    borderRadius: 10,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: "#666", fontSize: 14 },
  videoBox: { borderRadius: 10, overflow: "hidden" },
  thumbnail: { width: "100%", height: 220, backgroundColor: "#eee" },
  thumbnailPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbnailPlaceholderText: { color: "#999" },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 16,
  },
  actionButton: { paddingHorizontal: 10, paddingVertical: 4 },
  actionText: { color: "#fff", fontSize: 13 },
  deleteText: { color: "#ff8a8a" },
  hint: { fontSize: 12, color: "#666", marginTop: 12 },
  error: { fontSize: 12, color: "#d33", marginBottom: 8 },
});
