import { useState } from "react";
import type { ChatMessage } from "../types/domain";

export interface UseConversationResult {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
}

// TODO(phase-3): implement real fetching + realtime subscription via
// messages service (listMessages/subscribeToConversation).
export function useConversation(_conversationId: string | null): UseConversationResult {
  const [messages] = useState<ChatMessage[]>([]);
  const [loading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  async function sendMessage(_content: string): Promise<void> {
    // TODO: call sendMessage from messages service
  }

  return { messages, loading, error, sendMessage };
}
