import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthSession } from "../../src/services/supabase/auth";
import { useMatchCelebration } from "../../src/hooks/useMatchCelebration";
import { getConversationForMatch } from "../../src/services/supabase/matches";

/**
 * The match celebration screen. Reached from the discover screen right
 * after a mutual dink (see app/(tabs)/discover.tsx), which passes the
 * matched player's basic info as route params for an instant render;
 * useMatchCelebration falls back to looking everything up from just the
 * matchId if those params aren't present (e.g. a future deep link).
 *
 * Deliberately sporty/pickleball-specific copy throughout — no
 * romantic/dating language.
 */
export default function MatchCelebrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    matchId: string;
    otherUserId?: string;
    otherFirstName?: string;
    otherPhotoUrl?: string;
  }>();
  const { session } = useAuthSession();
  const userId = session?.user.id ?? null;
  const matchId = params.matchId ?? null;

  const { data, loading, error } = useMatchCelebration(matchId, userId, {
    otherUserId: params.otherUserId,
    otherFirstName: params.otherFirstName,
    otherPhotoUrl: params.otherPhotoUrl ? params.otherPhotoUrl : null,
  });

  const [sendingMessage, setSendingMessage] = useState(false);

  async function handleSendMessage() {
    if (!matchId) return;
    setSendingMessage(true);
    try {
      const conversation = await getConversationForMatch(matchId);
      if (!conversation) {
        Alert.alert("Hmm", "Couldn't find that conversation yet. Try again in a moment.");
        return;
      }
      router.push({
        pathname: "/(tabs)/messages/[conversationId]",
        params: { conversationId: conversation.id },
      });
    } catch {
      Alert.alert("Couldn't open messages", "Check your connection and try again.");
    } finally {
      setSendingMessage(false);
    }
  }

  function handleKeepDinking() {
    router.replace("/(tabs)/discover");
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Couldn't load this match."}</Text>
        <Pressable style={styles.secondaryButton} onPress={handleKeepDinking}>
          <Text style={styles.secondaryButtonText}>Back to Discover</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>MATCH</Text>
      </View>

      <Text style={styles.headline}>YOU DINKED!</Text>
      <Text style={styles.subheadline}>
        You and {data.otherFirstName} want to play.
      </Text>

      {data.otherPhotoUrl ? (
        <Image source={{ uri: data.otherPhotoUrl }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.photoPlaceholderText}>{data.otherFirstName}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={handleSendMessage}
          disabled={sendingMessage}
        >
          <Text style={styles.primaryButtonText}>
            {sendingMessage ? "Opening..." : "Send Message"}
          </Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleKeepDinking}>
          <Text style={styles.secondaryButtonText}>Keep Dinking</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f3d21",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  center: {
    flex: 1,
    backgroundColor: "#0f3d21",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  badge: {
    backgroundColor: "#1a7f37",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 12, letterSpacing: 2 },
  headline: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  subheadline: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 17,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 28,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: "#fff",
    marginBottom: 36,
  },
  photoPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#2a5c3e" },
  photoPlaceholderText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  actions: { width: "100%", gap: 12 },
  primaryButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: { color: "#0f3d21", fontWeight: "800", fontSize: 16 },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
  },
  secondaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  errorText: { color: "#fff", fontSize: 15, textAlign: "center", marginBottom: 20 },
});
