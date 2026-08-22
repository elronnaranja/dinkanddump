import { useCallback, useEffect, useState } from "react";
import type { MatchStatus } from "../types/database";
import { getConversationById, getMatch, otherParticipantId } from "../services/supabase/matches";
import { getPublicProfile, listProfilePhotos } from "../services/supabase/profiles";
import { getSignedPhotoUrl } from "../services/supabase/storage";

export interface ChatHeaderData {
  matchId: string;
  matchStatus: MatchStatus;
  otherUserId: string;
  otherFirstName: string;
  otherPhotoUrl: string | null;
}

export interface UseChatHeaderResult {
  data: ChatHeaderData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Resolves everything the chat screen's header (and action sheet) needs,
 * starting from just a conversationId — the only thing the route param
 * gives it. Walks conversation -> match -> other participant -> profile,
 * the reverse of how the match celebration screen already does match ->
 * conversation (see useMatchCelebration for the sibling lookup).
 */
export function useChatHeader(
  conversationId: string | null,
  currentUserId: string | null
): UseChatHeaderResult {
  const [data, setData] = useState<ChatHeaderData | null>(null);
  const [loading, setLoading] = useState<boolean>(!!conversationId && !!currentUserId);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!conversationId || !currentUserId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const conversation = await getConversationById(conversationId);
      if (!conversation) {
        setError("This conversation no longer exists.");
        return;
      }
      const match = await getMatch(conversation.match_id);
      if (!match) {
        setError("This match no longer exists.");
        return;
      }
      const otherUserId = otherParticipantId(match, currentUserId);
      const [profile, photos] = await Promise.all([
        getPublicProfile(otherUserId),
        listProfilePhotos(otherUserId),
      ]);
      const primaryPath = photos[0]?.storage_path ?? null;
      const otherPhotoUrl = primaryPath ? await getSignedPhotoUrl(primaryPath) : null;

      setData({
        matchId: match.id,
        matchStatus: match.status,
        otherUserId,
        otherFirstName: profile?.first_name ?? "Player",
        otherPhotoUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load this conversation.");
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
