// ============================================
// SafeQR v2 — Type Barrel Export
// ============================================

export type {
  EmergencyContact,
  ExternalNumber,
  ContactOverride,
  ContactId,
} from "./contact";
export { CONTACT_IDS } from "./contact";

export type { SiteConfig } from "./config";
export { DEFAULT_CONFIG } from "./config";

export type {
  HandbookTopic,
  EmergencyNumber,
  Spread,
  FlipDirection,
  BookState,
} from "./handbook";

export type {
  ChatMessage,
  ChatAPIResponse,
  ChatPanelState,
  ChatInputState,
  ChatSuggestion,
} from "./chat";

export type {
  LoginCredentials,
  AdminSession,
  AuthAPIResponse,
  ContactUpdatePayload,
  AgencyOption,
} from "./admin";
export { AGENCY_OPTIONS } from "./admin";
