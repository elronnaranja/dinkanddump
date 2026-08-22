import { useEffect, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ResizeMode, Video } from "expo-av";

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
 */
export function VideoModal({ visible, videoUrl, onClose }: VideoModalProps) {
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (!visible) {
      videoRef.current?.stopAsync().catch(() => undefined);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close video">
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>

        {videoUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay={visible}
            isLooping
          />
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
