import { useCallback, useEffect, useState } from "react";
import type { MatchListItem } from "../types/domain";
import {
  fetchMatchDistances,
  listConversationsForMatches,
  listMatchesForUser,
  otherParticipantId,
} from "../services/supabase/matches";
import { listMessagesForConversations } from "../services/supabase/messages";
import { listPrimaryPhotoPaths, listPublicProfiles } from "../services/supabase/profiles";
import { getSignedPhotoUrls } from "../services/supabase/storage";

export interface UseMatchesResult {
  matches: MatchListItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches every active match for the current user plus the display data the
 * Matches/Messages screens need: the other player's name/photo/skill/age,
 * distance, and (once a conversation has messages) the latest message
 * preview, timestamp, and unread count.
 *
 * This is a focus-refresh model, not a live subscription — Supabase
 * Realtime is used where it actually matters (message delivery inside an
 * open conversation, see useConversation). List screens just need to be
 * reasonably fresh each time they're shown; screens achieve that by calling
 * `refresh()` from `useFocusEffect`.
 */
export function useMatches(userId: string | null): UseMatchesResult {
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const matchRows = await listMatchesForUser(userId);
      if (matchRows.length === 0) {
        setMatches([]);
        return;
      }

      const otherUserIds = matchRows.map((m) => otherParticipantId(m, userId));
      const matchIds = matchRows.map((m) => m.id);

      const [conversations, distances, profiles, photoPaths] = await Promise.all([
        listConversationsForMatches(matchIds),
        fetchMatchDistances(),
        listPublicProfiles(otherUserIds),
        listPrimaryPhotoPaths(otherUserIds),
      ]);

      const conversationByMatchId = new Map(conversations.map((c) => [c.match_id, c]));
      const conversationIds = conversations.map((c) => c.id);
      const allMessages = await listMessagesForConversations(conversationIds);

      const photoUrls = await getSignedPhotoUrls(Object.values(photoPaths));
      const profileById = new Map(profiles.map((p) => [p.id, p]));

      const items: MatchListItem[] = matchRows.map((match) => {
        const otherUserId = otherParticipantId(match, userId);
        const conversation = conversationByMatchId.get(match.id) ?? null;
        const profile = profileById.get(otherUserId);
        const photoPath = photoPaths[otherUserId];

        const conversationMessages = conversation
          ? allMessages.filter((m) => m.conversation_id === conversation.id)
          : [];
        // allMessages is already sorted newest-first (listMessagesForConversations).
        const lastMessage = conversationMessages[0] ?? null;
        const unreadCount = conversationMessages.filter(
          (m) => m.sender_id !== userId && m.read_at === null
        ).length;

        return {
          id: match.id,
          conversationId: conversation?.id ?? null,
          otherUserId,
          otherFirstName: profile?.first_name ?? "Player",
          otherAge: profile?.age ?? null,
          otherPhotoUrl: photoPath ? photoUrls[photoPath] ?? null : null,
          skillLevel: profile?.skill_level ?? null,
          distanceKm: distances[match.id] ?? null,
          status: match.status,
          matchedAt: match.matched_at,
          lastMessagePreview: lastMessage?.content ?? null,
          lastMessageAt: lastMessage?.created_at ?? null,
          unreadCount,
        };
      });

      items.sort((a, b) => b.matchedAt.localeCompare(a.matchedAt));
      setMatches(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your matches.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { matches, loading, error, refresh };
}
