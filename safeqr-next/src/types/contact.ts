// ============================================
// SafeQR v2 — Emergency Contact Types
// ============================================

export interface EmergencyContact {
  id: "medical" | "fire" | "police" | "electricity" | "water" | "ward";
  name: string;
  phone: string;
  address: string;
  mapsQuery: string;
  icon: string;
  color: string;
  description: string;
}

export interface ExternalNumber {
  name: string;
  phone: string;
}

export interface ContactOverride {
  phone?: string;
  address?: string;
  mapsQuery?: string;
  description?: string;
  _updatedAt?: string;
}

export type ContactId = EmergencyContact["id"];

export const CONTACT_IDS: ContactId[] = [
  "medical",
  "fire",
  "police",
  "electricity",
  "water",
  "ward",
];
