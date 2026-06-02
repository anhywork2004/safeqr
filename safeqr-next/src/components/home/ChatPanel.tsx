// ============================================
// SafeQR v2 — AI Chat Panel with Suggestions
// ============================================
import React, { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { getDefaultWelcomeMessage } from "@/lib/chat";
import type { ChatSuggestion } from "@/types";

const SUGGESTIONS: ChatSuggestion[] = [
  { id: "burn", label: "Bỏng", icon: "🔥", prompt: "Cách sơ cứu khi bị bỏng?" },
  { id: "fire", label: "Thoát hiểm", icon: "🧯", prompt: "Cách thoát hiểm khi có cháy?" },
  { id: "stroke", label: "Đột quỵ", icon: "🧠", prompt: "Dấu hiệu đột quỵ và cách xử lý?" },
  { id: "accident", label: "Tai nạn", icon: "🚗", prompt: "Sơ cứu tai nạn giao thông?" },
  { id: "cpr", label: "CPR", icon: "❤️", prompt: "Hướng dẫn ép tim CPR?" },
  { id: "shock", label: "Điện giật", icon: "⚡", prompt: "Sơ cứu khi bị điện giật?" },
];

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ChatPanel({ open, onClose }: ChatPanelProps) {
  const { messages, inputState, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSend = async () => {
    if (!input.trim() || inputState === "sending") return;
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (s: ChatSuggestion) => {
    setInput(s.prompt);
    sendMessage(s.prompt);
  };

  if (!open) return null;

  return (
    <div className="no-print fixed bottom-[130px] right-4 z-[99] w-[calc(100vw-32px)] max-w-[380px] animate-chat-slide rounded-2xl bg-white shadow-modal">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-chat-600 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <div className="text-sm font-bold text-white">Trợ lý Sơ cứu</div>
            <div className="text-[10px] text-white/70">AI • SafeQR</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Đóng chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex max-h-[320px] flex-col gap-3 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="text-sm leading-relaxed text-warm-600 whitespace-pre-line">
            {getDefaultWelcomeMessage()}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === "user"
                    ? "bg-chat-600 text-white"
                    : "bg-warm-100 text-warm-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {inputState === "sending" && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-warm-100 px-4 py-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-chat-500" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-chat-500" style={{ animationDelay: "0.2s" }} />
              <span className="h-2 w-2 animate-pulse rounded-full bg-chat-500" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSuggestion(s)}
              className="btn-press inline-flex items-center gap-1 rounded-full border border-warm-200 bg-warm-50 px-3 py-1.5 text-xs font-medium text-warm-700 transition-colors hover:bg-warm-200"
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 border-t border-warm-200 p-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập câu hỏi sơ cứu..."
          rows={1}
          className="max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-warm-800 placeholder:text-warm-400 focus:border-red-400 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || inputState === "sending"}
          className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chat-600 text-white transition-colors hover:bg-chat-500 disabled:opacity-40"
          aria-label="Gửi"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
