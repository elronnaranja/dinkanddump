import { useCallback, useEffect, useState } from "react";
import { getMatch, otherParticipantId } from "../services/supabase/matches";
import { getPublicProfile, listProfilePhotos } from "../services/supabase/profiles";
import { getSignedPhotoUrl } from "../services/supabase/storage";

export interface MatchCelebrationData {
  otherUserId: string;
  otherFirstName: string;
  otherPhotoUrl: string | null;
}

export interface UseMatchCelebrationResult {
  data: MatchCelebrationData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Resolves the data the match celebration screen needs to render.
 *
 * The discover screen already has the matched player's basic info in hand
 * (from the discovery queue) at the moment it navigates here, so it's
 * passed through as route params for an instant, flicker-free render —
 * `knownFallback` covers that fast path. If the screen is reached without
 * that (e.g. a future deep link), this falls back to looking the match up
 * via getMatch()/getPublicProfile()/listProfilePhotos() so the screen is
 * still self-sufficient given just a matchId.
 */
export function useMatchCelebration(
  matchId: string | null,
  currentUserId: string | null,
  knownFallback?: Partial<MatchCelebrationData>
): UseMatchCelebrationResult {
  const hasKnownData = !!(knownFallback?.otherUserId && knownFallback?.otherFirstName);

  const [data, setData] = useState<MatchCelebrationData | null>(
    hasKnownData
      ? {
          otherUserId: knownFallback!.otherUserId!,
          otherFirstName: knownFallback!.otherFirstName!,
          otherPhotoUrl: knownFallback?.otherPhotoUrl ?? null,
        }
      : null
  );
  const [loading, setLoading] = useState<boolean>(!hasKnownData && !!matchId && !!currentUserId);
  const [error, setError] = useState<string | null>(null);

  const resolveFromServer = useCallback(async () => {
    if (!matchId || !currentUserId) return;
    setLoading(true);
    setError(null);
    try {
      const match = await getMatch(matchId);
      if (!match) {
        setError("This match no longer exists.");
        return;
      }
      const otherUserId = otherParticipantId(match, currentUserId);
      const profile = await getPublicProfile(otherUserId);
      const photos = await listProfilePhotos(otherUserId);
      const primaryPhotoPath = photos[0]?.storage_path ?? null;
      const otherPhotoUrl = primaryPhotoPath ? await getSignedPhotoUrl(primaryPhotoPath) : null;

      setData({
        otherUserId,
        otherFirstName: profile?.first_name ?? "your match",
        otherPhotoUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your match.");
    } finally {
      setLoading(false);
    }
  }, [matchId, currentUserId]);

  useEffect(() => {
    if (hasKnownData) return;
    resolveFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, currentUserId, hasKnownData]);

  return { data, loading, error };
}
