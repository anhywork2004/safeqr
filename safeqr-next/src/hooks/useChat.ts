// ============================================
// SafeQR v2 — Chat State Hook
// ============================================
import { useState, useCallback } from "react";
import type { ChatMessage } from "@/types";
import { sendChatMessage } from "@/lib/api";
import { findLocalAnswer, getFallbackMessage } from "@/lib/chat";
import { getItem, setItem } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";

let messageCounter = 0;
function nextId(): string {
  messageCounter += 1;
  return `msg-${Date.now()}-${messageCounter}`;
}

interface UseChatReturn {
  messages: ChatMessage[];
  inputState: "idle" | "sending" | "error";
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    getItem<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, [])
  );
  const [inputState, setInputState] = useState<"idle" | "sending" | "error">("idle");

  const persistMessages = useCallback((msgs: ChatMessage[]) => {
    // Keep last 50 messages
    const trimmed = msgs.slice(-50);
    setItem(STORAGE_KEYS.CHAT_MESSAGES, trimmed);
    setMessages(trimmed);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setInputState("sending");

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };

      const newMessages = [...messages, userMsg];
      persistMessages(newMessages);

      // Try API first
      const apiResp = await sendChatMessage(text.trim());

      let replyText: string;

      if (apiResp?.reply) {
        replyText = apiResp.reply;
      } else {
        // Fallback to local knowledge base
        const local = findLocalAnswer(text.trim());
        replyText = local || getFallbackMessage();
      }

      const aiMsg: ChatMessage = {
        id: nextId(),
        role: "ai",
        content: replyText,
        timestamp: Date.now(),
      };

      persistMessages([...newMessages, aiMsg]);
      setInputState("idle");
    },
    [messages, persistMessages]
  );

  const clearMessages = useCallback(() => {
    persistMessages([]);
  }, [persistMessages]);

  return { messages, inputState, sendMessage, clearMessages };
}
