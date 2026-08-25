import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthSession } from "../../src/services/supabase/auth";
import { DEFAULT_DISCOVERY_FILTERS, useDiscoveryQueue } from "../../src/hooks/useDiscoveryQueue";
import { useProfileMedia } from "../../src/hooks/useProfileMedia";
import { recordSwipe } from "../../src/services/supabase/swipes";
import { reportUser } from "../../src/services/supabase/safety";
import { track } from "../../src/services/analytics/track";
import { loadDiscoveryFilters } from "../../src/services/discoveryPreferences";
import { hasSeenSwipeTutorial, markSwipeTutorialSeen } from "../../src/services/swipeTutorial";
import type { DiscoveryCandidate, DiscoveryFilters } from "../../src/types/domain";
import { SwipeDeck } from "../../src/components/discovery/SwipeDeck";
import type { SwipeableCardHandle, SwipeDirection } from "../../src/components/discovery/SwipeableCard";
import { MoreInfoSheet } from "../../src/components/discovery/MoreInfoSheet";
import { VideoModal } from "../../src/components/discovery/VideoModal";
import { EmptyQueueState } from "../../src/components/discovery/EmptyQueueState";
import { ReportSheet } from "../../src/components/chat/ReportSheet";
import { SwipeTutorialOverlay } from "../../src/components/discovery/SwipeTutorialOverlay";

function filtersEqual(a: DiscoveryFilters, b: DiscoveryFilters): boolean {
  return (
    a.maxDistanceKm === b.maxDistanceKm &&
    a.skillMin === b.skillMin &&
    a.skillMax === b.skillMax &&
    a.gamePreference === b.gamePreference &&
    a.playPreference === b.playPreference &&
    a.genderPreference === b.genderPreference &&
    a.limit === b.limit
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useAuthSession();
  const userId = session?.user.id ?? null;

  // Persisted discovery preferences (app/discovery-preferences.tsx /
  // src/services/discoveryPreferences.ts). Reloaded every time this screen
  // regains focus, so returning from the preferences screen after hitting
  // "Apply" picks up the change. `filtersReady` gates the queue hook's
  // userId (below) so the very first load already uses the persisted
  // filters instead of fetching once with defaults and again moments later.
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_DISCOVERY_FILTERS);
  const [filtersReady, setFiltersReady] = useState(false);
  const didInitialFiltersApply = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      loadDiscoveryFilters().then((loaded) => {
        if (!mounted) return;
        setFilters((prev) => (filtersEqual(prev, loaded) ? prev : loaded));
        setFiltersReady(true);
      });
      return () => {
        mounted = false;
      };
    }, [])
  );

  const {
    candidates,
    loading: queueLoading,
    error: queueError,
    exhausted,
    refresh,
    consumeCandidate,
    restoreCandidate,
  } = useDiscoveryQueue(filtersReady ? userId : null, filters);

  // The hook's own mount effect (keyed on userId) already performs the
  // *first* fetch once filtersReady flips userId from null to a real id
  // above — so skip calling refresh() for that first transition and only
  // do it for filter changes discovered on a later focus (i.e. the user
  // actually changed something in the preferences screen and came back).
  useEffect(() => {
    if (!filtersReady) return;
    if (!didInitialFiltersApply.current) {
      didInitialFiltersApply.current = true;
      return;
    }
    if (!userId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, filtersReady]);

  const topCandidate: DiscoveryCandidate | null = candidates[0] ?? null;
  const {
    photos: topPhotos,
    video: topVideo,
    videoUrl: topVideoUrl,
    videoThumbnailUrl: topVideoThumbnailUrl,
  } = useProfileMedia(topCandidate?.id ?? null);

  const [infoVisible, setInfoVisible] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tutorialVisible, setTutorialVisible] = useState(false);

  useEffect(() => {
    hasSeenSwipeTutorial().then((seen) => {
      if (!seen) setTutorialVisible(true);
    });
  }, []);

  function dismissTutorial() {
    setTutorialVisible(false);
    markSwipeTutorialSeen();
  }

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

  function openFilters() {
    router.push("/discovery-preferences");
  }

  function handleOpenReport() {
    setInfoVisible(false);
    setReportVisible(true);
  }

  async function submitReport(reason: string) {
    if (!topCandidate || !userId) return;
    await reportUser(userId, "profile", topCandidate.id, reason);
    track("profile_reported", { reason });
    setReportVisible(false);
    Alert.alert("Report submitted", "Thanks for letting us know — our team will take a look.");
  }

  if (sessionLoading || !filtersReady || (queueLoading && candidates.length === 0)) {
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
    return (
      <View style={styles.container}>
        <DiscoverHeader onOpenFilters={openFilters} />
        <EmptyQueueState onRefresh={refresh} onAdjustFilters={openFilters} refreshing={queueLoading} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DiscoverHeader onOpenFilters={openFilters} />

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
          onOpenInfo={() => {
            setInfoVisible(true);
            track("profile_viewed", { source: "discovery_card" });
          }}
        />
      </View>

      <MoreInfoSheet
        visible={infoVisible}
        candidate={topCandidate}
        photos={topPhotos}
        hasVideo={!!topVideo}
        videoThumbnailUrl={topVideoThumbnailUrl}
        onOpenVideo={() => setVideoVisible(true)}
        onClose={() => setInfoVisible(false)}
        onReport={handleOpenReport}
        onDump={() => handleButtonPress("left")}
        onDink={() => handleButtonPress("right")}
        actionsDisabled={actionPending}
      />
      <VideoModal
        visible={videoVisible}
        videoUrl={topVideoUrl}
        onClose={() => setVideoVisible(false)}
      />
      <ReportSheet
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={submitReport}
      />
      <SwipeTutorialOverlay visible={tutorialVisible} onDismiss={dismissTutorial} />
    </View>
  );
}

/** Entry point into app/discovery-preferences.tsx. */
function DiscoverHeader({ onOpenFilters }: { onOpenFilters: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.headerTitle}>Discover</Text>
      <Pressable onPress={onOpenFilters} hitSlop={12} style={styles.filterButton}>
        <Text style={styles.filterButtonText}>Filters</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  filterButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterButtonText: { fontSize: 13, fontWeight: "600", color: "#333" },
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
