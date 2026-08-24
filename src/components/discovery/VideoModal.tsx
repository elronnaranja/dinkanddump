import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

interface VideoModalProps {
  visible: boolean;
  videoUrl: string | null;
  onClose: () => void;
}

/**
 * Full-screen gameplay video playback. Deliberately never mounted/rendered
 * until the user explicitly taps to open it (see DiscoveryCard's video
 * badge) — the discovery feed itself never autoplays video. Once opened,
 * playback starts automatically (the tap *is* the explicit play action)
 * with native controls for pause/seek/mute.
 *
 * expo-video's player is created once per source (via useVideoPlayer) and
 * outlives the modal's visibility — play/pause is driven explicitly by the
 * `visible` effect below rather than an expo-av-style `shouldPlay` prop,
 * since expo-video has no such declarative playback prop.
 */
export function VideoModal({ visible, videoUrl, onClose }: VideoModalProps) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (!videoUrl) return;
    if (visible) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [visible, videoUrl, player]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close video">
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>

        {videoUrl ? (
          <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />
        ) : (
          <Text style={styles.unavailable}>Video unavailable.</Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  video: { width: "100%", height: "70%" },
  closeButton: { position: "absolute", top: 56, right: 20, zIndex: 1, padding: 10 },
  closeButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  unavailable: { color: "#fff", textAlign: "center" },
});
