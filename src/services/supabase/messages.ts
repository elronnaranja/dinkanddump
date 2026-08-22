import { supabase } from "./client";
import type { MessageRow } from "../../types/database";

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<MessageRow> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function markMessageRead(messageId: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) throw error;
}

/**
 * Marks every unread message *from the other participant* in a conversation
 * as read in one round trip — used when the chat screen gains focus, rather
 * than marking messages read one at a time. Deliberately excludes the
 * caller's own messages (sender_id <> currentUserId) so a user can't mark
 * their own outgoing messages "read".
 */
export async function markConversationRead(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", currentUserId)
    .is("read_at", null);

  if (error) throw error;
}

/**
 * Batch fetch of every message across a set of conversations, newest first.
 * Used by useMatches to compute each match's last-message preview and
 * unread count in a single query rather than one per conversation. Fine as
 * a full fetch for V1 — see listMessages for the per-conversation
 * equivalent used by the chat screen itself.
 */
export async function listMessagesForConversations(
  conversationIds: string[]
): Promise<MessageRow[]> {
  if (conversationIds.length === 0) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: MessageRow) => void
): () => void {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new as MessageRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
