// ============================================
// SafeQR v2 — Chat Types
// ============================================

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: number;
}

export interface ChatAPIResponse {
  reply: string;
}

export type ChatPanelState = "collapsed" | "expanded" | "loading";
export type ChatInputState = "idle" | "sending" | "error";

export interface ChatSuggestion {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}
