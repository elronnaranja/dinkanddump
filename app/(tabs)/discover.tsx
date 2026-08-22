import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuthSession } from "../../src/services/supabase/auth";
import { useDiscoveryQueue } from "../../src/hooks/useDiscoveryQueue";
import { useProfileMedia } from "../../src/hooks/useProfileMedia";
import { recordSwipe } from "../../src/services/supabase/swipes";
import { track } from "../../src/services/analytics/track";
import type { DiscoveryCandidate } from "../../src/types/domain";
import { SwipeDeck } from "../../src/components/discovery/SwipeDeck";
import type { SwipeableCardHandle, SwipeDirection } from "../../src/components/discovery/SwipeableCard";
import { ActionButtons } from "../../src/components/discovery/ActionButtons";
import { MoreInfoSheet } from "../../src/components/discovery/MoreInfoSheet";
import { VideoModal } from "../../src/components/discovery/VideoModal";
import { EmptyQueueState } from "../../src/components/discovery/EmptyQueueState";

export default function DiscoverScreen() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useAuthSession();
  const userId = session?.user.id ?? null;

  const {
    candidates,
    loading: queueLoading,
    error: queueError,
    exhausted,
    refresh,
    consumeCandidate,
    restoreCandidate,
  } = useDiscoveryQueue(userId);

  const topCandidate: DiscoveryCandidate | null = candidates[0] ?? null;
  const {
    photos: topPhotos,
    video: topVideo,
    videoUrl: topVideoUrl,
  } = useProfileMedia(topCandidate?.id ?? null);

  const [infoVisible, setInfoVisible] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const cardRef = useRef<SwipeableCardHandle>(null);

  async function handleSwiped(direction: SwipeDirection, candidate: DiscoveryCandidate) {
    const action = direction === "right" ? "dink" : "dump";
    setInfoVisible(false);
    setVideoVisible(false);
    setActionPending(true);
    setActionError(null);

    try {
      const result = await recordSwipe(candidate.id, action);
      track(action, { skillLevel: candidate.skillLevel });
      consumeCandidate(candidate.id);

      if (action === "dink" && result.matched && result.matchId) {
        track("match_created", { matchId: result.matchId });
        router.push({
          pathname: "/match/[matchId]",
          params: {
            matchId: result.matchId,
            otherUserId: candidate.id,
            otherFirstName: candidate.firstName,
            otherPhotoUrl: candidate.primaryPhotoUrl ?? "",
          },
        });
      }
    } catch {
      // The card already animated off-screen optimistically — put the
      // candidate back at the front so the user can retry rather than
      // silently losing the swipe.
      restoreCandidate(candidate);
      setActionError("Couldn't save that — check your connection and try again.");
    } finally {
      setActionPending(false);
    }
  }

  function handleButtonPress(direction: SwipeDirection) {
    if (!topCandidate || actionPending) return;
    if (direction === "right") {
      cardRef.current?.swipeRight();
    } else {
      cardRef.current?.swipeLeft();
    }
  }

  if (sessionLoading || (queueLoading && candidates.length === 0)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>You need to be signed in to browse players.</Text>
      </View>
    );
  }

  if (queueError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{queueError}</Text>
        <Pressable style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!topCandidate) {
    return <EmptyQueueState onRefresh={refresh} refreshing={queueLoading} />;
  }

  return (
    <View style={styles.container}>
      {actionError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{actionError}</Text>
        </View>
      )}

      <View style={styles.deckArea}>
        <SwipeDeck
          ref={cardRef}
          candidates={candidates}
          topPhotos={topPhotos}
          topHasVideo={!!topVideo}
          onSwiped={handleSwiped}
          onOpenVideo={() => setVideoVisible(true)}
          onOpenInfo={() => setInfoVisible(true)}
        />
      </View>

      <ActionButtons
        onDump={() => handleButtonPress("left")}
        onDink={() => handleButtonPress("right")}
        disabled={actionPending}
      />

      <MoreInfoSheet
        visible={infoVisible}
        candidate={topCandidate}
        onClose={() => setInfoVisible(false)}
      />
      <VideoModal
        visible={videoVisible}
        videoUrl={topVideoUrl}
        onClose={() => setVideoVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fafafa",
  },
  deckArea: { flex: 1, padding: 16, paddingBottom: 8 },
  errorText: { fontSize: 15, color: "#d33", textAlign: "center", marginBottom: 16 },
  errorBanner: { backgroundColor: "#fdecea", paddingVertical: 8, paddingHorizontal: 16 },
  errorBannerText: { color: "#c0392b", fontSize: 13, textAlign: "center" },
  retryButton: {
    backgroundColor: "#1a7f37",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: { color: "#fff", fontWeight: "700" },
});
