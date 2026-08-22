import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageRow } from "../types/database";
import type { ChatMessage } from "../types/domain";
import { mapMessageRowToChatMessage } from "../types/domain";
import {
  listMessages,
  markConversationRead,
  sendMessage as sendMessageToServer,
  subscribeToConversation,
} from "../services/supabase/messages";

export interface UseConversationResult {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  sendError: string | null;
  sendMessage: (content: string) => Promise<void>;
  /** Marks every unread message from the other participant as read. */
  markRead: () => Promise<void>;
}

function isTempId(id: string): boolean {
  return id.startsWith("temp-");
}

function sortByCreatedAt(list: ChatMessage[]): ChatMessage[] {
  return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Merges an incoming message (initial fetch row, or a realtime INSERT) into
 * the current list, deduping three ways:
 *  - by id, if this exact row is already present (e.g. the realtime echo of
 *    a message sendMessage() already reconciled)
 *  - against a pending optimistic (`temp-...`) entry from this same client,
 *    matched by sender + content, in case the realtime echo arrives before
 *    the sendMessage() call resolves
 *  - otherwise appended as a genuinely new message (typically from the
 *    other participant)
 */
function mergeMessage(
  prev: ChatMessage[],
  incoming: ChatMessage,
  currentUserId: string | null
): ChatMessage[] {
  const existingIndex = prev.findIndex((m) => m.id === incoming.id);
  if (existingIndex !== -1) {
    const next = [...prev];
    next[existingIndex] = incoming;
    return next;
  }

  if (currentUserId && incoming.senderId === currentUserId) {
    const tempIndex = prev.findIndex((m) => isTempId(m.id) && m.content === incoming.content);
    if (tempIndex !== -1) {
      const next = [...prev];
      next[tempIndex] = incoming;
      return next;
    }
  }

  return sortByCreatedAt([...prev, incoming]);
}

/**
 * Real-time-backed conversation state for the chat screen: initial fetch +
 * Supabase Realtime subscription (postgres_changes INSERT on `messages`,
 * scoped to this conversation_id — see subscribeToConversation) + an
 * optimistic send that reconciles against the realtime echo.
 */
export function useConversation(
  conversationId: string | null,
  currentUserId: string | null
): UseConversationResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(!!conversationId);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Realtime callback is registered once per conversationId but needs the
  // *latest* currentUserId for dedupe matching — a ref avoids re-subscribing
  // the channel every time currentUserId's identity changes (it shouldn't,
  // but this is cheap insurance).
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  useEffect(() => {
    let cancelled = false;

    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    listMessages(conversationId)
      .then((rows) => {
        if (cancelled) return;
        setMessages(sortByCreatedAt(rows.map(mapMessageRowToChatMessage)));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Couldn't load messages.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = subscribeToConversation(conversationId, (row: MessageRow) => {
      setMessages((prev) =>
        mergeMessage(prev, mapMessageRowToChatMessage(row), currentUserIdRef.current)
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !conversationId || !currentUserId) return;

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: currentUserId,
        content: trimmed,
        createdAt: new Date().toISOString(),
        readAt: null,
      };

      setSendError(null);
      setSending(true);
      setMessages((prev) => sortByCreatedAt([...prev, optimistic]));

      try {
        const row = await sendMessageToServer(conversationId, currentUserId, trimmed);
        const real = mapMessageRowToChatMessage(row);
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          // The realtime echo may have already landed and been merged in as
          // its own append while this await was in flight — don't duplicate.
          if (withoutTemp.some((m) => m.id === real.id)) return withoutTemp;
          return sortByCreatedAt([...withoutTemp, real]);
        });
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        const message = e instanceof Error ? e.message : "Message didn't send. Try again.";
        setSendError(message);
        throw e;
      } finally {
        setSending(false);
      }
    },
    [conversationId, currentUserId]
  );

  const markRead = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    try {
      await markConversationRead(conversationId, currentUserId);
    } catch {
      // Best-effort — a failed read-receipt update isn't worth surfacing.
    }
  }, [conversationId, currentUserId]);

  return { messages, loading, error, sending, sendError, sendMessage, markRead };
}
