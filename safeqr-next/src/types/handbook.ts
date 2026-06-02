// ============================================
// SafeQR v2 — Handbook Types
// ============================================

export interface HandbookTopic {
  num: string;
  icon: string;
  accent: string;
  title: string;
  items?: string[];
  fast?: string[];
  tips?: string;
  numbers?: EmergencyNumber[];
  closing?: boolean;
  text?: string;
  call: string;
  coverInside?: boolean;
}

export interface EmergencyNumber {
  label: string;
  num: string;
  color: string;
}

export interface Spread {
  index: number;
  left: HandbookTopic | null;
  right: HandbookTopic | null;
  label: string;
}

export type FlipDirection = "forward" | "backward";

export type BookState = "closed" | "opening" | "open" | "closing" | "flipping";
