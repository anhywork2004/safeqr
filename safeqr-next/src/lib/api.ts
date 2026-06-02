// ============================================
// SafeQR v2 — API Client
// ============================================

import type {
  EmergencyContact,
  SiteConfig,
  AuthAPIResponse,
  ContactUpdatePayload,
  ChatAPIResponse,
} from "@/types";
import { sanitize } from "./security";
import { API_TIMEOUT } from "./constants";

// Same-domain API (uses Cloudflare Pages Functions)
const API_BASE = "";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!resp.ok) return null;

    return (await resp.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Public endpoints ──────────────────────────────────────────

export async function fetchContacts(): Promise<EmergencyContact[] | null> {
  return apiFetch<EmergencyContact[]>("/api/contacts");
}

export async function fetchConfig(): Promise<SiteConfig | null> {
  return apiFetch<SiteConfig>("/api/config");
}

// ── Auth ──────────────────────────────────────────────────────

export async function loginAPI(
  agencyId: string,
  password: string
): Promise<AuthAPIResponse | null> {
  return apiFetch<AuthAPIResponse>("/api/auth", {
    method: "POST",
    body: JSON.stringify({
      agencyId: sanitize(agencyId),
      password,
    }),
  });
}

export async function updateContactAPI(
  id: string,
  data: ContactUpdatePayload,
  token: string
): Promise<EmergencyContact | null> {
  return apiFetch<EmergencyContact>(`/api/contacts/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    } as Record<string, string>,
    body: JSON.stringify({
      phone: sanitize(data.phone),
      address: sanitize(data.address),
      maps_query: sanitize(data.maps_query),
      description: sanitize(data.description),
    }),
  });
}

export async function changePasswordAPI(
  currentPwd: string,
  newPwd: string,
  token: string
): Promise<{ success: boolean } | null> {
  return apiFetch<{ success: boolean }>("/api/password", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    } as Record<string, string>,
    body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
  });
}

// ── Chat ──────────────────────────────────────────────────────

export async function sendChatMessage(
  message: string
): Promise<ChatAPIResponse | null> {
  return apiFetch<ChatAPIResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message: sanitize(message) }),
  });
}

// ── Health ────────────────────────────────────────────────────

export async function checkAPIHealth(): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE}/api/contacts`, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
