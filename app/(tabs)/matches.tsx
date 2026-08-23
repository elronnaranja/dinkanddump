import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthSession } from "../../src/services/supabase/auth";
import { useMatches } from "../../src/hooks/useMatches";
import { getConversationForMatch } from "../../src/services/supabase/matches";
import type { MatchListItem } from "../../src/types/domain";
import { formatDistanceKm } from "../../src/utils/distance";
import { formatRelativeShort } from "../../src/utils/time";
import { skillLevelLabel } from "../../src/constants/pickleballOptions";

/**
 * Full list of the current user's active matches. Distinct from the
 * Messages tab (app/(tabs)/messages/index.tsx), which is the same
 * underlying data filtered down to matches that already have a
 * conversation with at least one message, sorted by recent activity — see
 * that file for the full design note on why Matches/Messages aren't
 * collapsed into a single screen.
 */
export default function MatchesScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const userId = session?.user.id ?? null;
  const { matches, loading, error, refresh } = useMatches(userId);

  useFocusEffect(
    useCallback(() => {
      refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])
  );

  async function openMatch(match: MatchListItem) {
    if (match.conversationId) {
      router.push({
        pathname: "/(tabs)/messages/[conversationId]",
        params: { conversationId: match.conversationId },
      });
      return;
    }
    // Conversations are created atomically with the match by record_swipe()
    // (migration 0007), so this should always be a no-op fallback — but
    // resolve it live rather than leaving the row dead-tappable if the
    // batch fetch in useMatches ever missed it.
    const conversation = await getConversationForMatch(match.id);
    if (conversation) {
      router.push({
        pathname: "/(tabs)/messages/[conversationId]",
        params: { conversationId: conversation.id },
      });
    }
  }

  if (loading && matches.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && matches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Start Dinking to find players.</Text>
        <Text style={styles.emptyBody}>
          Matches show up here as soon as you and another player both dink.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/(tabs)/discover")}>
          <Text style={styles.primaryButtonText}>Go to Discover</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Matches</Text>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MatchRow match={item} onPress={() => openMatch(item)} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function MatchRow({ match, onPress }: { match: MatchListItem; onPress: () => void }) {
  const meta = [
    match.skillLevel ? skillLevelLabel(match.skillLevel) : null,
    match.distanceKm != null ? formatDistanceKm(match.distanceKm) : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {match.otherPhotoUrl ? (
        <Image source={{ uri: match.otherPhotoUrl }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.photoPlaceholderText}>{match.otherFirstName[0]}</Text>
        </View>
      )}

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {match.otherFirstName}
            {match.otherAge != null ? `, ${match.otherAge}` : ""}
          </Text>
          {match.lastMessageAt ? (
            <Text style={styles.timestamp}>{formatRelativeShort(match.lastMessageAt)}</Text>
          ) : null}
        </View>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        <Text style={styles.preview} numberOfLines={1}>
          {match.lastMessagePreview ?? "Say hi!"}
        </Text>
      </View>

      {match.unreadCount > 0 ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>
            {match.unreadCount > 9 ? "9+" : match.unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: { paddingBottom: 24 },
  errorBanner: { backgroundColor: "#fdecea", paddingVertical: 8, paddingHorizontal: 16 },
  errorBannerText: { color: "#c0392b", fontSize: 13, textAlign: "center" },
  errorText: { fontSize: 15, color: "#d33", textAlign: "center", marginBottom: 16 },
  retryButton: {
    backgroundColor: "#1a7f37",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: { color: "#fff", fontWeight: "700" },
  emptyTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  emptyBody: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: "#1a7f37",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  photo: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#eee" },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { color: "#999", fontWeight: "700", fontSize: 18 },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "700", color: "#222", flexShrink: 1 },
  timestamp: { fontSize: 12, color: "#999", marginLeft: 8 },
  meta: { fontSize: 12, color: "#1a7f37", marginTop: 2 },
  preview: { fontSize: 14, color: "#666", marginTop: 2 },
  unreadBadge: {
    backgroundColor: "#1a7f37",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
