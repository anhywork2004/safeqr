// ============================================
// SafeQR v2 — Shared Constants
// ============================================

export const APP_NAME = "SafeQR – QR Khẩn Cấp";
export const APP_VERSION = "2.0.0";

export const STORAGE_KEYS = {
  CONTACTS: "safeqr_contacts",
  PASSWORDS: "safeqr_passwords",
  TOKEN: "safeqr_token",
  SESSION: "safeqr_session",
  FLOAT_SOS_X: "safeqr_float_sos_x",
  FLOAT_SOS_Y: "safeqr_float_sos_y",
  FLOAT_CHAT_X: "safeqr_float_chat_x",
  FLOAT_CHAT_Y: "safeqr_float_chat_y",
  CHAT_MESSAGES: "safeqr_chat_messages",
} as const;

export const API_TIMEOUT = 8000; // ms

export const SOS_PHONE = "112";

export const HOTLINE_NUMBERS = [
  { number: "115", label: "Cấp cứu", color: "#e74c3c" },
  { number: "114", label: "Cứu hỏa", color: "#e67e22" },
  { number: "113", label: "Công an", color: "#2c3e50" },
] as const;
