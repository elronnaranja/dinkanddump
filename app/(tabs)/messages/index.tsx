import { useCallback, useMemo } from "react";
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
import { useAuthSession } from "../../../src/services/supabase/auth";
import { useMatches } from "../../../src/hooks/useMatches";
import type { MatchListItem } from "../../../src/types/domain";
import { formatRelativeShort } from "../../../src/utils/time";
import { VerifiedBadge } from "../../../src/components/ui/VerifiedBadge";

/**
 * Design decision (Matches vs Messages): both screens are built on the same
 * useMatches data rather than a second, separately-fetched "conversations"
 * concept — there's no server-side idea of a conversation independent of
 * its match, so a second parallel data path would just be duplicated work
 * that could drift out of sync.
 *
 * - Matches (app/(tabs)/matches.tsx) is the *complete* roster of active
 *   matches, including ones nobody has messaged in yet ("Say hi!").
 * - Messages (this screen) is that same roster filtered down to matches
 *   with at least one message, sorted by most recent activity, with unread
 *   badges — i.e. a conversations-with-activity view, not a duplicate list.
 *
 * This keeps the two tabs meaningfully different (browse-all-matches vs.
 * active-conversations-by-recency) without showing the same empty "Say
 * hi!" rows twice across two tabs.
 */
export default function MessagesListScreen() {
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

  const conversations = useMemo(
    () =>
      matches
        .filter((m) => m.conversationId && m.lastMessageAt)
        .sort((a, b) => (b.lastMessageAt as string).localeCompare(a.lastMessageAt as string)),
    [matches]
  );

  function openConversation(match: MatchListItem) {
    if (!match.conversationId) return;
    router.push({
      pathname: "/(tabs)/messages/[conversationId]",
      params: { conversationId: match.conversationId },
    });
  }

  if (loading && conversations.length === 0 && matches.length === 0) {
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

  if (conversations.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No conversations yet.</Text>
        <Text style={styles.emptyBody}>
          Say hi to one of your matches and it'll show up here.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/(tabs)/matches")}>
          <Text style={styles.primaryButtonText}>Go to Matches</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Messages</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow match={item} onPress={() => openConversation(item)} />
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function ConversationRow({ match, onPress }: { match: MatchListItem; onPress: () => void }) {
  const unread = match.unreadCount > 0;
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
          <View style={styles.nameRow}>
            <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
              {match.otherFirstName}
            </Text>
            <VerifiedBadge verified={match.emailVerified} size={13} />
          </View>
          {match.lastMessageAt ? (
            <Text style={[styles.timestamp, unread && styles.timestampUnread]}>
              {formatRelativeShort(match.lastMessageAt)}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
          {match.lastMessagePreview}
        </Text>
      </View>

      {unread ? (
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
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#222", flexShrink: 1 },
  nameUnread: { fontWeight: "800" },
  timestamp: { fontSize: 12, color: "#999", marginLeft: 8 },
  timestampUnread: { color: "#1a7f37", fontWeight: "700" },
  preview: { fontSize: 14, color: "#666", marginTop: 2 },
  previewUnread: { color: "#222", fontWeight: "600" },
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
