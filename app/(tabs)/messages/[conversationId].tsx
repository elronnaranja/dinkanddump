import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useAuthSession } from "../../../src/services/supabase/auth";
import { useChatHeader } from "../../../src/hooks/useChatHeader";
import { useConversation } from "../../../src/hooks/useConversation";
import { unmatch } from "../../../src/services/supabase/matches";
import { blockUser, reportUser } from "../../../src/services/supabase/safety";
import { track } from "../../../src/services/analytics/track";
import { MessageBubble } from "../../../src/components/chat/MessageBubble";
import { ChatActionSheet } from "../../../src/components/chat/ChatActionSheet";
import { ReportSheet } from "../../../src/components/chat/ReportSheet";
import { OtherProfileSheet } from "../../../src/components/chat/OtherProfileSheet";

/**
 * Real-time 1:1 chat for a match. conversationId is the only thing the
 * route gives us — useChatHeader walks conversation -> match -> other
 * participant to resolve everything the header/action sheet need, while
 * useConversation owns the message list + Supabase Realtime subscription +
 * optimistic send.
 *
 * None of Unmatch/Block/Report notify the other person (per spec) — they
 * just update state and send the current user back to Matches.
 */
export default function ConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = params.conversationId ?? null;

  const { session } = useAuthSession();
  const userId = session?.user.id ?? null;

  const {
    data: header,
    loading: headerLoading,
    error: headerError,
  } = useChatHeader(conversationId, userId);

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    sending,
    sendError,
    sendMessage,
    markRead,
  } = useConversation(conversationId, userId);

  const [draft, setDraft] = useState("");
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      markRead();
    }, [markRead])
  );

  async function handleSend() {
    const content = draft;
    if (!content.trim() || !conversationId) return;
    const isFirstMessage = messages.length === 0;
    setDraft("");
    try {
      await sendMessage(content);
      track("message_sent", { conversationId });
      if (isFirstMessage) {
        track("conversation_started", { conversationId });
      }
    } catch {
      // sendError is already surfaced in the UI below the input.
    }
  }

  function handleUnmatch() {
    if (!header) return;
    setActionSheetVisible(false);
    Alert.alert("Unmatch?", `You won't see ${header.otherFirstName} in your matches anymore.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unmatch",
        style: "destructive",
        onPress: async () => {
          setActionPending(true);
          try {
            await unmatch(header.matchId);
            router.replace("/(tabs)/matches");
          } catch {
            Alert.alert("Couldn't unmatch", "Check your connection and try again.");
          } finally {
            setActionPending(false);
          }
        },
      },
    ]);
  }

  function handleBlock() {
    if (!header || !userId) return;
    setActionSheetVisible(false);
    Alert.alert(
      "Block this player?",
      `You won't see ${header.otherFirstName} again, and this conversation will end.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setActionPending(true);
            try {
              await blockUser(userId, header.otherUserId);
              track("profile_blocked");
              router.replace("/(tabs)/matches");
            } catch {
              Alert.alert("Couldn't block", "Check your connection and try again.");
            } finally {
              setActionPending(false);
            }
          },
        },
      ]
    );
  }

  function handleReport() {
    setActionSheetVisible(false);
    setReportSheetVisible(true);
  }

  async function submitReport(reason: string) {
    if (!header || !userId) return;
    await reportUser(userId, "profile", header.otherUserId, reason);
    track("profile_reported", { reason });
    setReportSheetVisible(false);
    Alert.alert("Report submitted", "Thanks for letting us know — our team will take a look.");
  }

  function handleViewProfile() {
    setActionSheetVisible(false);
    setProfileSheetVisible(true);
    track("profile_viewed", { source: "chat" });
  }

  if (headerLoading || messagesLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (headerError || !header) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{headerError ?? "Couldn't load this conversation."}</Text>
        <Pressable style={styles.retryButton} onPress={() => router.replace("/(tabs)/matches")}>
          <Text style={styles.retryButtonText}>Back to Matches</Text>
        </Pressable>
      </View>
    );
  }

  const isActive = header.matchStatus === "active";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Text style={styles.backButtonText}>{"‹"}</Text>
        </Pressable>

        <Pressable style={styles.headerCenter} onPress={handleViewProfile}>
          {header.otherPhotoUrl ? (
            <Image source={{ uri: header.otherPhotoUrl }} style={styles.headerPhoto} />
          ) : (
            <View style={[styles.headerPhoto, styles.headerPhotoPlaceholder]}>
              <Text style={styles.headerPhotoPlaceholderText}>{header.otherFirstName[0]}</Text>
            </View>
          )}
          <Text style={styles.headerName} numberOfLines={1}>
            {header.otherFirstName}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActionSheetVisible(true)}
          style={styles.menuButton}
          disabled={actionPending}
          hitSlop={12}
        >
          <Text style={styles.menuButtonText}>{"⋯"}</Text>
        </Pressable>
      </View>

      {messagesError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{messagesError}</Text>
        </View>
      ) : null}

      {!isActive ? (
        <View style={styles.inactiveBanner}>
          <Text style={styles.inactiveBannerText}>
            This match is no longer active — you can't send new messages here.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble message={item} isOwn={item.senderId === userId} />}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyMessagesText}>
              Say hi to {header.otherFirstName} — plan a game, ask about skill level, whatever
              gets the ball rolling.
            </Text>
          </View>
        }
      />

      {sendError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{sendError}</Text>
        </View>
      ) : null}

      {isActive ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message..."
            placeholderTextColor="#999"
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
          >
            <Text style={styles.sendButtonText}>{sending ? "..." : "Send"}</Text>
          </Pressable>
        </View>
      ) : null}

      <ChatActionSheet
        visible={actionSheetVisible}
        otherFirstName={header.otherFirstName}
        onClose={() => setActionSheetVisible(false)}
        onViewProfile={handleViewProfile}
        onUnmatch={handleUnmatch}
        onBlock={handleBlock}
        onReport={handleReport}
      />
      <OtherProfileSheet
        visible={profileSheetVisible}
        userId={header.otherUserId}
        onClose={() => setProfileSheetVisible(false)}
      />
      <ReportSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        onSubmit={submitReport}
      />
    </KeyboardAvoidingView>
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
  errorText: { fontSize: 15, color: "#d33", textAlign: "center", marginBottom: 16 },
  retryButton: {
    backgroundColor: "#1a7f37",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: { color: "#fff", fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: { width: 36, alignItems: "flex-start", justifyContent: "center" },
  backButtonText: { fontSize: 28, color: "#1a7f37", fontWeight: "600" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerPhoto: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#eee" },
  headerPhotoPlaceholder: { alignItems: "center", justifyContent: "center" },
  headerPhotoPlaceholderText: { color: "#999", fontWeight: "700" },
  headerName: { fontSize: 16, fontWeight: "700", color: "#222", flexShrink: 1 },
  menuButton: { width: 36, alignItems: "flex-end", justifyContent: "center" },
  menuButtonText: { fontSize: 22, color: "#333" },
  errorBanner: { backgroundColor: "#fdecea", paddingVertical: 8, paddingHorizontal: 16 },
  errorBannerText: { color: "#c0392b", fontSize: 13, textAlign: "center" },
  inactiveBanner: { backgroundColor: "#fff8e1", paddingVertical: 8, paddingHorizontal: 16 },
  inactiveBannerText: { color: "#8a6d3b", fontSize: 12, textAlign: "center" },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  emptyMessages: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyMessagesText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#222",
  },
  sendButton: {
    backgroundColor: "#1a7f37",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
