// ============================================
// SafeQR v2 — Frontend Security Utilities
// ============================================

const XSS_PATTERN =
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript\s*:|on\w+\s*=|<\s*iframe|<\s*embed|<\s*object|<\s*form|data\s*:\s*text\/html/gi;

/**
 * Sanitize a string by stripping dangerous XSS patterns.
 */
export function sanitize(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(XSS_PATTERN, "").trim();
}

/**
 * Escape HTML special characters for safe DOM insertion.
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  return input.replace(/[&<>"'/]/g, (ch) => map[ch] || ch);
}

/**
 * Validate a phone number (Vietnamese format).
 */
export function isValidPhone(phone: string): boolean {
  return /^[\d.*#+]{3,20}$/.test(phone);
}

/**
 * Validate a URL string.
 */
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Generate a simple session ID (crypto-based).
 */
export function generateSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Check if running on localhost.
 */
export function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/**
 * Report CSP violations if the endpoint exists.
 */
export function reportCSPViolation(report: unknown): void {
  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon(
        "/api/csp-report",
        JSON.stringify(report)
      );
    }
  } catch {
    // Silently fail — CSP reporting is best-effort
  }
}
