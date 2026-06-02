// ============================================
// SafeQR v2 — Admin Types
// ============================================

import type { ContactId, ContactOverride } from "./contact";

export interface LoginCredentials {
  agencyId: string;
  password: string;
}

export interface AdminSession {
  agencyId: ContactId;
  agencyName: string;
  loginTime: number;
  useApi: boolean;
  sessionId: string;
}

export interface AuthAPIResponse {
  token: string;
  agencyId: string;
  agencyName: string;
}

export interface ContactUpdatePayload {
  phone: string;
  address: string;
  maps_query: string;
  description: string;
}

export interface AgencyOption {
  value: ContactId;
  label: string;
  color: string;
}

export const AGENCY_OPTIONS: AgencyOption[] = [
  { value: "medical", label: "Cấp cứu y tế (115)", color: "#e74c3c" },
  { value: "fire", label: "Cảnh sát PCCC & CNCH (114)", color: "#e67e22" },
  { value: "police", label: "Công an địa phương (113)", color: "#2c3e50" },
  { value: "electricity", label: "Điện lực (19001006)", color: "#f39c12" },
  { value: "water", label: "Cấp nước (19001047)", color: "#3498db" },
  { value: "ward", label: "Đường dây nóng UBND phường", color: "#9b59b6" },
];
