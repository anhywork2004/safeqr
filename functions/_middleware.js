// ============================================================
// SafeQR – Security Middleware (applied to all /api/* routes)
// ============================================================
// Runs BEFORE every API handler. Provides:
//   - Strict security headers on every response
//   - Rate limiting (general + strict for auth endpoints)
//   - Request body size validation
//   - HTTP method validation
//   - Path traversal detection
//   - Request logging
//   - Error wrapping
// ============================================================

// ─── Security Headers ───────────────────────────────────────

const SECURITY_HEADERS = {
  // Enforce HTTPS for 1 year
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS filter in older browsers
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy - restrict to only what's needed
  'Permissions-Policy':
    'camera=(), ' +
    'microphone=(), ' +
    'geolocation=(self), ' +
    'payment=(), ' +
    'usb=(), ' +
    'magnetometer=(), ' +
    'gyroscope=(), ' +
    'speaker=(self), ' +
    'vibrate=(self), ' +
    'fullscreen=(self), ' +
    'clipboard-write=(self)',

  // Content-Security-Policy for API responses (informational)
  'Content-Security-Policy':
    "default-src 'none'; " +
    "frame-ancestors 'none'; " +
    "form-action 'none'; " +
    "base-uri 'none'; " +
    "sandbox; ",

  // Cache control for API responses
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',

  // Remove server fingerprinting
  'Server': '',

  // Cross-Origin security
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'unsafe-none',
};

// ─── CORS Headers ────────────────────────────────────────────

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';

  // Allowed origins (restrict in production)
  const ALLOWED_ORIGINS = [
    'https://safeqr.io',
    'https://www.safeqr.io',
    'https://safeqr.pages.dev',
  ];

  // In development, allow localhost and null origin (file://)
  const isDev = origin.startsWith('http://localhost') ||
                origin.startsWith('http://127.0.0.1') ||
                origin === 'null';

  const allowOrigin = (isDev || ALLOWED_ORIGINS.includes(origin))
    ? (origin || '*')
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'Retry-After',
  };
}

// ─── Rate Limiter (in-memory, per-isolate) ──────────────────

const rateStore = new Map();

/**
 * Simple sliding-window rate limiter.
 *
 * @param {string} key - Unique identifier (usually IP + endpoint)
 * @param {number} maxRequests - Max requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{allowed: boolean, retryAfter: number, remaining: number}}
 */
function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = rateStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateStore.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

  const count = entry.timestamps.length;

  if (count >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter), remaining: 0 };
  }

  entry.timestamps.push(now);

  // Periodic cleanup of stale entries (~1% of requests)
  if (Math.random() < 0.01) {
    const expireBefore = now - 300000; // 5 minutes
    for (const [k, v] of rateStore) {
      if (v.timestamps.every(ts => ts <= expireBefore)) {
        rateStore.delete(k);
      }
    }
  }

  return { allowed: true, retryAfter: 0, remaining: maxRequests - count - 1 };
}

// ─── Client IP Extraction ────────────────────────────────────

function getClientIP(request) {
  // Cloudflare provides the real client IP
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) return cfIP;

  // Fallback for non-Cloudflare environments
  const xff = request.headers.get('X-Forwarded-For');
  if (xff) return xff.split(',')[0].trim();

  const xri = request.headers.get('X-Real-IP');
  if (xri) return xri;

  return 'unknown';
}

// ─── Request Logging ─────────────────────────────────────────

function logRequest(request, ip) {
  const method = request.method;
  const url = new URL(request.url);
  const ua = (request.headers.get('User-Agent') || 'unknown').substring(0, 80);
  console.log(
    `[${new Date().toISOString()}] ${method} ${url.pathname} ` +
    `ip=${ip} ua="${ua}"`
  );
}

// ─── Main Middleware ─────────────────────────────────────────

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;
  const ip = getClientIP(request);

  // ── 1. Log every API request ──────────────────────────────
  logRequest(request, ip);

  // ── 2. Validate HTTP method ───────────────────────────────
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'];
  if (!allowedMethods.includes(method)) {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...SECURITY_HEADERS,
        ...corsHeaders(request),
        'Allow': 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
      },
    });
  }

  // ── 3. Block path traversal attacks ───────────────────────
  if (path.includes('..') || path.includes('//') ||
      path.includes('%2e%2e') || path.includes('%2f%2f') ||
      path.includes('%00')) {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...SECURITY_HEADERS,
        ...corsHeaders(request),
      },
    });
  }

  // ── 4. Rate Limiting ──────────────────────────────────────

  // Strict: Auth login endpoint (10 attempts/minute per IP)
  if (path === '/api/auth' && method === 'POST') {
    const authLimit = checkRateLimit(`auth:${ip}`, 10, 60000);
    if (!authLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many login attempts. Please try again later.',
          retryAfter: authLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(authLimit.retryAfter),
            ...SECURITY_HEADERS,
            ...corsHeaders(request),
          },
        }
      );
    }
  }

  // Moderate: Password change endpoint (20 attempts/minute per IP)
  if (path === '/api/password' && method === 'PUT') {
    const pwLimit = checkRateLimit(`password:${ip}`, 20, 60000);
    if (!pwLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter: pwLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(pwLimit.retryAfter),
            ...SECURITY_HEADERS,
            ...corsHeaders(request),
          },
        }
      );
    }
  }

  // General: All API endpoints (100 requests/minute per IP)
  const generalLimit = checkRateLimit(`general:${ip}`, 100, 60000);
  if (!generalLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please slow down.',
        retryAfter: generalLimit.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(generalLimit.retryAfter),
          ...SECURITY_HEADERS,
          ...corsHeaders(request),
        },
      }
    );
  }

  // ── 5. Body size check for write methods ──────────────────
  const MAX_BODY_SIZE = 64 * 1024; // 64 KB
  if (['POST', 'PUT'].includes(method)) {
    const contentLength = parseInt(
      request.headers.get('Content-Length') || '0', 10
    );
    if (contentLength > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Request body too large' }),
        {
          status: 413,
          headers: {
            'Content-Type': 'application/json',
            ...SECURITY_HEADERS,
            ...corsHeaders(request),
          },
        }
      );
    }
  }

  // ── 6. Call the actual handler ────────────────────────────
  try {
    const response = await context.next();

    // Clone response to add security headers
    const headers = new Headers(response.headers);

    // Merge security headers (don't overwrite if handler set them)
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!headers.has(name)) {
        headers.set(name, value);
      }
    }

    // Always add CORS headers
    const cors = corsHeaders(request);
    for (const [name, value] of Object.entries(cors)) {
      if (!headers.has(name)) {
        headers.set(name, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (err) {
    console.error(
      `[Middleware] Unhandled error on ${method} ${path}:`,
      err.message
    );
    return new Response(
      JSON.stringify({ error: 'Internal server error', status: 500 }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...SECURITY_HEADERS,
          ...corsHeaders(request),
        },
      }
    );
  }
}
