// ============================================================
// SafeQR – Security Module (shared by all API endpoints)
// ============================================================
// Provides: PBKDF2 password hashing, JWT creation/verification,
// input sanitization, validation helpers, security headers,
// and an in-memory rate limiter.
// ============================================================

const JWT_EXPIRY = 8 * 60 * 60; // 8 hours (seconds)
const PBKDF2_ITERATIONS = 100000;
const MAX_BODY_SIZE = 64 * 1024; // 64 KB
const MAX_CHAT_MESSAGE_LENGTH = 500;
const AGENCY_ID_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;
const PHONE_PATTERN = /^[\d\s.()-]{3,20}$/;

// ─── Base64 helpers (safe for Web Crypto) ────────────────────

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function toBytes(base64) {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

function base64UrlEncode(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str) {
  return str.replace(/-/g, '+').replace(/_/g, '/');
}

// ─── Password Hashing (PBKDF2 with salt) ────────────────────
//
// Format: "$pbkdf2-sha256$<iterations>$<salt_b64>$<hash_b64>"
//
// Backward-compatible with old format (plain SHA-256, no salt).
// On verification of old-format hash, the password is
// automatically re-hashed with PBKDF2.

async function hashPasswordPBKDF2(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(password),
    { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    256
  );
  return toBase64(bits);
}

async function hashPasswordLegacy(pwd) {
  const data = new TextEncoder().encode(pwd);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toBase64(hash);
}

/**
 * Hash a plaintext password with PBKDF2 + random salt.
 * Returns a structured hash string for storage.
 */
export async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = toBase64(saltBytes);
  const hash = await hashPasswordPBKDF2(password, salt);
  return `$pbkdf2-sha256$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verify a password against a stored hash.
 * Supports both PBKDF2 and legacy SHA-256 formats.
 * Returns {valid, needsUpgrade} where needsUpgrade=true
 * means the password should be re-hashed.
 */
export async function verifyPassword(password, storedHash) {
  // New PBKDF2 format: $pbkdf2-sha256$<iters>$<salt>$<hash>
  if (storedHash.startsWith('$pbkdf2-sha256$')) {
    const parts = storedHash.split('$');
    // parts[0]='', parts[1]='pbkdf2-sha256', parts[2]=iters, parts[3]=salt, parts[4]=hash
    if (parts.length !== 5) return { valid: false, needsUpgrade: false };
    const salt = parts[3];
    const expectedHash = parts[4];
    const computed = await hashPasswordPBKDF2(password, salt);
    return { valid: computed === expectedHash, needsUpgrade: false };
  }

  // Legacy: plain SHA-256 (no salt)
  const legacyHash = await hashPasswordLegacy(password);
  if (legacyHash === storedHash) {
    return { valid: true, needsUpgrade: true };
  }
  return { valid: false, needsUpgrade: false };
}

/**
 * Re-hash a password if it uses the old format.
 * Call this after successful verification when needsUpgrade=true.
 */
export async function upgradePasswordIfNeeded(password, storedHash, env, agencyId) {
  const result = await verifyPassword(password, storedHash);
  if (result.valid && result.needsUpgrade) {
    const newHash = await hashPassword(password);
    await env.DB.prepare(
      'UPDATE passwords SET password_hash = ? WHERE agency_id = ?'
    ).bind(newHash, agencyId).run();
  }
  return result;
}

// ─── JWT (HMAC-SHA256 via Web Crypto) ───────────────────────

export async function createToken(agencyId, agencyName, secret) {
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: agencyId,
    name: agencyName,
    iat: now,
    exp: now + JWT_EXPIRY,
    jti: crypto.randomUUID(), // unique token ID for revocation
  };

  const b64Header = base64UrlEncode(toBase64(encoder.encode(JSON.stringify(header))));
  const b64Payload = base64UrlEncode(toBase64(encoder.encode(JSON.stringify(payload))));
  const message = b64Header + '.' + b64Payload;

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const b64Sig = base64UrlEncode(toBase64(sig));

  return message + '.' + b64Sig;
}

export async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const encoder = new TextEncoder();
    const message = parts[0] + '.' + parts[1];
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    );
    const sig = toBytes(base64UrlDecode(parts[2]));
    const valid = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(message));
    if (!valid) return null;

    const payloadJson = atob(base64UrlDecode(parts[1]));
    const payload = JSON.parse(payloadJson);
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7), env.JWT_SECRET);
}

// ─── Input Validation & Sanitization ────────────────────────

/**
 * Sanitize a string to prevent XSS.
 * Strips HTML tags and dangerous characters.
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate agency ID format.
 */
export function validateAgencyId(id) {
  if (typeof id !== 'string') return false;
  return AGENCY_ID_PATTERN.test(id);
}

/**
 * Validate a phone number.
 */
export function validatePhone(phone) {
  if (typeof phone !== 'string') return false;
  return PHONE_PATTERN.test(phone.trim());
}

/**
 * Validate and clamp string length.
 */
export function validateStringLength(str, min, max) {
  if (typeof str !== 'string') return false;
  return str.length >= min && str.length <= max;
}

/**
 * Parse JSON body with size limit.
 * Returns {data, error}
 */
export async function parseBody(request, maxSize = MAX_BODY_SIZE) {
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > maxSize) {
    return { data: null, error: 'Request body too large' };
  }

  // Also check actual body size
  const text = await request.text();
  if (text.length > maxSize) {
    return { data: null, error: 'Request body too large' };
  }

  try {
    return { data: JSON.parse(text), error: null };
  } catch {
    return { data: null, error: 'Invalid JSON' };
  }
}

// ─── Rate Limiter (in-memory, per-isolate) ──────────────────

const rateStore = new Map();

/**
 * Simple sliding-window rate limiter.
 *
 * @param {string} key - Unique identifier (usually IP)
 * @param {number} maxAttempts - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{allowed: boolean, retryAfter: number, remaining: number}}
 */
export function checkRateLimit(key, maxAttempts = 30, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = rateStore.get(key);

  // Clean expired entries
  if (entry && entry.timestamps) {
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
  } else {
    entry = { timestamps: [] };
  }

  const count = entry.timestamps.length;

  if (count >= maxAttempts) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter), remaining: 0 };
  }

  entry.timestamps.push(now);
  rateStore.set(key, entry);

  // Auto-cleanup: remove stale entries every ~100 requests
  if (Math.random() < 0.01) cleanupRateStore(now - 300000);

  return { allowed: true, retryAfter: 0, remaining: maxAttempts - count - 1 };
}

/**
 * Strict rate limiter for auth endpoints.
 */
export function checkAuthRateLimit(key) {
  return checkRateLimit('auth:' + key, 10, 60000); // 10 attempts per minute
}

function cleanupRateStore(expireBefore) {
  for (const [key, entry] of rateStore) {
    if (entry.timestamps && entry.timestamps.length === 0) {
      rateStore.delete(key);
    }
    if (entry.timestamps) {
      entry.timestamps = entry.timestamps.filter(ts => ts > expireBefore);
      if (entry.timestamps.length === 0) rateStore.delete(key);
    }
  }
}

// ─── Client IP Extraction ────────────────────────────────────

export function getClientIP(request) {
  // Cloudflare provides the connecting IP in CF-Connecting-IP header
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) return cfIP;

  // Fallback to X-Forwarded-For or X-Real-IP
  const xff = request.headers.get('X-Forwarded-For');
  if (xff) return xff.split(',')[0].trim();

  const xri = request.headers.get('X-Real-IP');
  if (xri) return xri;

  return 'unknown';
}

// ─── Security Headers ────────────────────────────────────────

/**
 * Return a base set of security headers applied to every response.
 */
export function securityHeaders(extra = {}) {
  return {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Enable XSS filter in older browsers
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions policy - only allow what's needed
    'Permissions-Policy':
      'camera=(), ' +
      'microphone=(), ' +
      'geolocation=(self), ' +
      'payment=(), ' +
      'usb=(), ' +
      'magnetometer=(), ' +
      'gyroscope=(), ' +
      'speaker=(), ' +
      'vibrate=(), ' +
      'fullscreen=(self)',

    // HSTS (only if served over HTTPS — Cloudflare handles this)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Cache control for API responses
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',

    ...extra,
  };
}

/**
 * CORS headers with restricted origins.
 * In production, restrict to known origins.
 */
export function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': 'https://safeqr.io',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    ...extra,
  };
}

// ─── Response Helpers ────────────────────────────────────────

/**
 * Build a JSON response with all security headers.
 */
export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...securityHeaders(),
      ...corsHeaders(),
      ...extraHeaders,
    },
  });
}

/**
 * Build an error response. Sanitizes error messages in production.
 */
export function errorResponse(message, status = 400, detail = null) {
  // Sanitize error messages — don't leak internal details
  const safeMessages = {
    400: 'Bad request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not found',
    429: 'Too many requests',
    500: 'Internal server error',
  };

  const body = {
    error: safeMessages[status] || message,
    status,
  };

  // Only include detail for non-500 errors to avoid leaking internals
  if (detail && status !== 500) {
    body.detail = sanitizeInput(String(detail));
  }

  return jsonResponse(body, status);
}

/**
 * CORS preflight handler.
 */
export function handleOptions(methods = 'GET, POST, PUT, OPTIONS') {
  return new Response(null, {
    status: 204,
    headers: {
      ...securityHeaders(),
      'Access-Control-Allow-Origin': 'https://safeqr.io',
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// ─── Request Logging ─────────────────────────────────────────

/**
 * Log a request for security auditing.
 * In production, consider sending to a logging service.
 */
export function logRequest(request, type = 'api') {
  const ip = getClientIP(request);
  const method = request.method;
  const url = new URL(request.url);
  console.log(`[${new Date().toISOString()}] ${type} ${method} ${url.pathname} from ${ip}`);
}

// ─── Export constants ────────────────────────────────────────

export { JWT_EXPIRY, MAX_BODY_SIZE, MAX_CHAT_MESSAGE_LENGTH };
