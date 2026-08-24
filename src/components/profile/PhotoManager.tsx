import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { ProfilePhotoRow } from "../../types/database";
import {
  deleteProfilePhoto,
  insertProfilePhoto,
  listProfilePhotos,
  reorderProfilePhotos,
} from "../../services/supabase/profiles";
import {
  deletePhoto as deleteStoragePhoto,
  getSignedPhotoUrls,
  uploadPhoto,
} from "../../services/supabase/storage";
import { moderatePhoto } from "../../services/supabase/moderation";
import { buildPhotoFileName, compressImage, MAX_PHOTOS } from "../../utils/media";
import { track } from "../../services/analytics/track";

interface PhotoManagerProps {
  userId: string;
  /**
   * Whether this user's email is verified — profile_photos enforces a
   * server-side gate (migration 0020) blocking anyone unverified from
   * having more than 1 photo, checked against auth.users directly at
   * insert time. This prop lets pickAndUpload short-circuit with a clear
   * message before even opening the picker, rather than letting the user
   * hit the raw Postgres error after picking a photo.
   */
  emailVerified: boolean;
  onCountChange?: (count: number) => void;
}

interface PhotoItem {
  row: ProfilePhotoRow;
  url: string | null;
  uploading?: boolean;
}

export function PhotoManager({ userId, emailVerified, onCountChange }: PhotoManagerProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listProfilePhotos(userId);
      const urls = await getSignedPhotoUrls(rows.map((r) => r.storage_path));
      setPhotos(rows.map((row) => ({ row, url: urls[row.storage_path] ?? null })));
      onCountChange?.(rows.length);
    } catch {
      setError("Couldn't load your photos.");
    } finally {
      setLoading(false);
    }
  }, [userId, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function pickAndUpload(replacePhotoId?: string) {
    if (!replacePhotoId && photos.length >= MAX_PHOTOS) return;
    if (!replacePhotoId && !emailVerified && photos.length >= 1) {
      Alert.alert(
        "Verify your email first",
        "Add more photos once you've verified your email address. You can resend the verification email from Settings."
      );
      return;
    }

    setError(null);
    // The whole flow — permission request, launching the picker, and the
    // compress/upload pipeline — is one try/catch. A failure anywhere here
    // (permission API failure, picker launch failure, network failure, etc.)
    // must surface as an error message, never as an unhandled promise
    // rejection with no user-facing feedback.
    let tempId: string | undefined;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo access needed",
          "Enable photo library access in Settings to add photos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: true,
        aspect: [3, 4],
      });
      if (result.canceled || !result.assets?.[0]) return;

      tempId = replacePhotoId ?? `pending-${Date.now()}`;
      const position = replacePhotoId
        ? photos.find((p) => p.row.id === replacePhotoId)?.row.position ?? 0
        : photos.length;

      setBusyId(tempId);
      const compressedUri = await compressImage(result.assets[0].uri);
      const fileName = buildPhotoFileName("jpg");
      const path = await uploadPhoto(userId, compressedUri, fileName);

      const moderation = await moderatePhoto(path);
      if (!moderation.approved) {
        await deleteStoragePhoto(path).catch(() => undefined);
        setError(moderation.reason ?? "This photo was rejected. Please choose a different photo.");
        return;
      }

      if (replacePhotoId) {
        const existing = photos.find((p) => p.row.id === replacePhotoId);
        if (existing) {
          await deleteStoragePhoto(existing.row.storage_path).catch(() => undefined);
          await deleteProfilePhoto(existing.row.id);
        }
      }
      await insertProfilePhoto(userId, path, position);
      track("photo_uploaded", { replaced: !!replacePhotoId });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(photoId: string) {
    setBusyId(photoId);
    setError(null);
    try {
      const item = photos.find((p) => p.row.id === photoId);
      if (item) {
        await deleteStoragePhoto(item.row.storage_path).catch(() => undefined);
        await deleteProfilePhoto(photoId);
      }
      const remaining = photos.filter((p) => p.row.id !== photoId);
      await reorderProfilePhotos(
        remaining.map((p, index) => ({ id: p.row.id, position: index }))
      );
      await load();
    } catch {
      setError("Couldn't delete that photo.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(photoId: string, direction: -1 | 1) {
    const index = photos.findIndex((p) => p.row.id === photoId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= photos.length) return;

    const reordered = [...photos];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setBusyId(photoId);
    setError(null);
    try {
      await reorderProfilePhotos(
        reordered.map((p, i) => ({ id: p.row.id, position: i }))
      );
      await load();
    } catch {
      setError("Couldn't reorder photos.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ marginVertical: 24 }} />;
  }

  return (
    <View>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.grid}>
        {photos.map((item, index) => (
          <View key={item.row.id} style={styles.tile}>
            {item.url ? (
              <Image source={{ uri: item.url }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]} />
            )}
            {index === 0 && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>Primary</Text>
              </View>
            )}
            {busyId === item.row.id && (
              <View style={styles.busyOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <View style={styles.tileActions}>
              <Pressable
                onPress={() => handleMove(item.row.id, -1)}
                disabled={index === 0}
                style={styles.actionButton}
              >
                <Text style={[styles.actionText, index === 0 && styles.actionTextDisabled]}>
                  Up
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleMove(item.row.id, 1)}
                disabled={index === photos.length - 1}
                style={styles.actionButton}
              >
                <Text
                  style={[
                    styles.actionText,
                    index === photos.length - 1 && styles.actionTextDisabled,
                  ]}
                >
                  Down
                </Text>
              </Pressable>
              <Pressable onPress={() => pickAndUpload(item.row.id)} style={styles.actionButton}>
                <Text style={styles.actionText}>Replace</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(item.row.id)} style={styles.actionButton}>
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {photos.length < MAX_PHOTOS && (
          <Pressable
            style={[styles.tile, styles.addTile]}
            onPress={() => pickAndUpload()}
            disabled={busyId !== null}
          >
            {busyId !== null && busyId.startsWith("pending-") ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.addText}>+ Add photo</Text>
            )}
          </Pressable>
        )}
      </View>
      <Text style={styles.hint}>
        {photos.length}/{MAX_PHOTOS} photos · first photo is your primary photo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "47%", aspectRatio: 3 / 4, borderRadius: 10, overflow: "hidden" },
  image: { width: "100%", height: "100%", backgroundColor: "#eee" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  addTile: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: "#666", fontSize: 14 },
  primaryBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#1a7f37",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  primaryBadgeText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  tileActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingVertical: 4,
  },
  actionButton: { paddingHorizontal: 6, paddingVertical: 2 },
  actionText: { color: "#fff", fontSize: 11 },
  actionTextDisabled: { color: "rgba(255,255,255,0.35)" },
  deleteText: { color: "#ff8a8a" },
  hint: { fontSize: 12, color: "#666", marginTop: 12 },
  error: { fontSize: 12, color: "#d33", marginBottom: 8 },
});
