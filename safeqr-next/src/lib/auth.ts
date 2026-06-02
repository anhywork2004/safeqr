// ============================================
// SafeQR v2 — Auth Helpers
// ============================================

import type { AdminSession, AuthAPIResponse } from "@/types";
import { generateSessionId } from "./security";
import { STORAGE_KEYS } from "./constants";
import { getItem, setItem, removeItem } from "./storage";

/**
 * Save JWT token to localStorage.
 */
export function saveToken(token: string): void {
  setItem(STORAGE_KEYS.TOKEN, token);
}

/**
 * Load JWT token from localStorage.
 */
export function getToken(): string | null {
  return getItem<string | null>(STORAGE_KEYS.TOKEN, null);
}

/**
 * Remove JWT token.
 */
export function clearToken(): void {
  removeItem(STORAGE_KEYS.TOKEN);
}

/**
 * Check if JWT token is expired (client-side decode).
 */
export function isTokenExpired(token: string): boolean {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return true;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return false;

    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Create an admin session from auth response.
 */
export function createSession(response: AuthAPIResponse, useApi: boolean): AdminSession {
  const session: AdminSession = {
    agencyId: response.agencyId as AdminSession["agencyId"],
    agencyName: response.agencyName,
    loginTime: Date.now(),
    useApi,
    sessionId: generateSessionId(),
  };
  setItem(STORAGE_KEYS.SESSION, session);
  return session;
}

/**
 * Load current admin session from storage.
 */
export function loadSession(): AdminSession | null {
  return getItem<AdminSession | null>(STORAGE_KEYS.SESSION, null);
}

/**
 * Clear admin session and token.
 */
export function clearSession(): void {
  removeItem(STORAGE_KEYS.SESSION);
  clearToken();
}

/**
 * Validate that we have a valid session.
 */
export function validateSession(): AdminSession | null {
  const session = loadSession();
  if (!session) return null;

  const token = getToken();
  if (session.useApi && (!token || isTokenExpired(token))) {
    clearSession();
    return null;
  }

  // Session expires after 8 hours
  if (Date.now() - session.loginTime > 8 * 60 * 60 * 1000) {
    clearSession();
    return null;
  }

  return session;
}
