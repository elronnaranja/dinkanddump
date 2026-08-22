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
