// ============================================================
// SafeQR API Worker – Cloudflare Workers + D1
// ============================================================
// REST API for emergency contacts management.
// Security: PBKDF2 password hashing, JWT auth, rate limiting,
// input sanitization, strict security headers, CORS control.
// ============================================================

const JWT_EXPIRY = 8 * 60 * 60;
const PBKDF2_ITERATIONS = 100000;
const MAX_BODY_SIZE = 64 * 1024;

// ─── Base64 Helpers ──────────────────────────────────────────

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function toBytes(base64) {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

function b64Url(s) { return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
function fromB64Url(s) { return s.replace(/-/g, '+').replace(/_/g, '/'); }

// ─── Security Headers ────────────────────────────────────────

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=(self), vibrate=(self), fullscreen=(self), clipboard-write=(self)',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Server': '',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const ALLOWED = ['https://safeqr.io', 'https://www.safeqr.io', 'https://safeqr.pages.dev'];
  const isDev = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin === 'null';
  const allowOrigin = (isDev || ALLOWED.includes(origin)) ? (origin || '*') : ALLOWED[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'Retry-After',
  };
}

// ─── Response Helpers ────────────────────────────────────────

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
  });
}

function errorResponse(status = 400) {
  const msgs = { 400: 'Bad request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not found', 413: 'Body too large', 429: 'Too many requests', 500: 'Internal server error' };
  return jsonResponse({ error: msgs[status] || 'Error', status }, status);
}

// ─── Password Hashing (PBKDF2 + legacy SHA-256 auto-upgrade) ─

async function hashPBKDF2(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, key, 256);
  return toBase64(bits);
}

async function hashLegacy(pwd) {
  return toBase64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd)));
}

async function hashPassword(password) {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPBKDF2(password, salt);
  return `$pbkdf2-sha256$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

async function verifyPassword(password, storedHash) {
  if (storedHash.startsWith('$pbkdf2-sha256$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 5) return { valid: false, needsUpgrade: false };
    const computed = await hashPBKDF2(password, parts[3]);
    return { valid: computed === parts[4], needsUpgrade: false };
  }
  const legacy = await hashLegacy(password);
  return { valid: legacy === storedHash, needsUpgrade: legacy === storedHash };
}

// ─── JWT (HMAC-SHA256) ──────────────────────────────────────

async function createToken(agencyId, agencyName, secret) {
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: agencyId, name: agencyName, iat: now, exp: now + JWT_EXPIRY, jti: crypto.randomUUID() };
  const b64H = b64Url(toBase64(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))));
  const b64P = b64Url(toBase64(enc.encode(JSON.stringify(payload))));
  const msg = b64H + '.' + b64P;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return msg + '.' + b64Url(toBase64(sig));
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const enc = new TextEncoder();
    const msg = parts[0] + '.' + parts[1];
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('HMAC', key, toBytes(fromB64Url(parts[2])), enc.encode(msg))) return null;
    const payload = JSON.parse(atob(fromB64Url(parts[1])));
    return (payload.exp >= Math.floor(Date.now() / 1000)) ? payload : null;
  } catch { return null; }
}

async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7), env.JWT_SECRET);
}

// ─── Input Helpers ───────────────────────────────────────────

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() || request.headers.get('X-Real-IP') || 'unknown';
}

async function parseBody(request) {
  const cl = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (cl > MAX_BODY_SIZE) return { data: null, error: true };
  try { return { data: await request.json(), error: false }; }
  catch { return { data: null, error: true }; }
}

// ─── Rate Limiter ────────────────────────────────────────────

const rateStore = new Map();

function checkRateLimit(key, maxReq, windowMs) {
  const now = Date.now(), ws = now - windowMs;
  let e = rateStore.get(key);
  if (!e) { e = { ts: [] }; rateStore.set(key, e); }
  e.ts = e.ts.filter(t => t > ws);
  if (e.ts.length >= maxReq) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((e.ts[0] + windowMs - now) / 1000)), remaining: 0 };
  }
  e.ts.push(now);
  if (Math.random() < 0.01) {
    const exp = now - 300000;
    for (const [k, v] of rateStore) { if (v.ts.every(t => t <= exp)) rateStore.delete(k); }
  }
  return { allowed: true, retryAfter: 0, remaining: maxReq - e.ts.length };
}

// ─── Route Handlers ──────────────────────────────────────────

async function listContacts(env) {
  const { results } = await env.DB.prepare('SELECT id, name, phone, address, maps_query, icon, color, description, updated_at FROM contacts ORDER BY id').all();
  return jsonResponse(results);
}

async function getContact(id, env) {
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(id)) return errorResponse(400);
  const c = await env.DB.prepare('SELECT id, name, phone, address, maps_query, icon, color, description, updated_at FROM contacts WHERE id = ?').bind(id).first();
  return c ? jsonResponse(c) : errorResponse(404);
}

async function updateContact(id, req, env) {
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(id)) return errorResponse(400);
  const user = await requireAuth(req, env);
  if (!user) return errorResponse(401);
  if (user.sub !== id) return errorResponse(403);

  const { data: body, error: parseErr } = await parseBody(req);
  if (parseErr) return errorResponse(400);

  const allowed = ['phone', 'address', 'maps_query', 'description'];
  const fields = [], values = [];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      let val = sanitize(String(body[key]).trim());
      if (key === 'phone' && !/^[\d\s.()-]{3,20}$/.test(val)) return errorResponse(400);
      if (key === 'address' && val.length > 500) return errorResponse(400);
      if (key === 'maps_query' && val.length > 200) return errorResponse(400);
      if (key === 'description' && val.length > 1000) return errorResponse(400);
      fields.push(key + ' = ?');
      values.push(val);
    }
  }
  if (fields.length === 0) return errorResponse(400);
  fields.push("updated_at = datetime('now')");
  await env.DB.prepare('UPDATE contacts SET ' + fields.join(', ') + ' WHERE id = ?').bind(...values, id).run();
  return getContact(id, env);
}

async function login(req, env) {
  const { data: body, error: parseErr } = await parseBody(req);
  if (parseErr) return errorResponse(400);

  const agencyId = sanitize(String(body.agencyId || ''));
  const password = String(body.password || '');

  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(agencyId) || password.length < 4 || password.length > 128) {
    return errorResponse(400);
  }

  const record = await env.DB.prepare('SELECT password_hash FROM passwords WHERE agency_id = ?').bind(agencyId).first();
  if (!record) {
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + Date.now()));
    return errorResponse(401);
  }

  const result = await verifyPassword(password, record.password_hash);
  if (!result.valid) return errorResponse(401);

  if (result.needsUpgrade) {
    await env.DB.prepare('UPDATE passwords SET password_hash = ? WHERE agency_id = ?').bind(await hashPassword(password), agencyId).run();
  }

  const contact = await env.DB.prepare('SELECT name FROM contacts WHERE id = ?').bind(agencyId).first();
  const token = await createToken(agencyId, contact?.name || agencyId, env.JWT_SECRET);
  return jsonResponse({ token, agencyId, agencyName: contact?.name || agencyId });
}

async function changePassword(req, env) {
  const user = await requireAuth(req, env);
  if (!user) return errorResponse(401);

  const { data: body, error: parseErr } = await parseBody(req);
  if (parseErr) return errorResponse(400);

  const cp = String(body.currentPassword || '');
  const np = String(body.newPassword || '');

  if (!cp || !np) return errorResponse(400);
  if (np.length < 8 || np.length > 128) return jsonResponse({ error: 'New password must be 8-128 characters' }, 400);
  if (cp === np) return jsonResponse({ error: 'New password must differ from current' }, 400);
  if (!/[A-Za-z]/.test(np) || !/[0-9]/.test(np)) return jsonResponse({ error: 'Password must contain letters and numbers' }, 400);

  const record = await env.DB.prepare('SELECT password_hash FROM passwords WHERE agency_id = ?').bind(user.sub).first();
  if (!record) return errorResponse(404);

  const result = await verifyPassword(cp, record.password_hash);
  if (!result.valid) return jsonResponse({ error: 'Current password is incorrect' }, 403);

  await env.DB.prepare('UPDATE passwords SET password_hash = ? WHERE agency_id = ?').bind(await hashPassword(np), user.sub).run();
  return jsonResponse({ success: true, message: 'Password updated' });
}

async function getConfig(env) {
  const { results } = await env.DB.prepare('SELECT key, value FROM site_config').all();
  const config = {};
  for (const row of results) config[row.key] = row.value;
  return jsonResponse(config);
}

// ─── Router ──────────────────────────────────────────────────

async function router(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const ip = getClientIP(request);

  console.log(`[${new Date().toISOString()}] ${method} ${path} ip=${ip}`);

  // Block path traversal
  if (path.includes('..') || path.includes('//') || /%2[ef]/i.test(path) || path.includes('%00')) {
    return errorResponse(400);
  }

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...corsHeaders(request) } });
  }

  // Rate limiting
  if (path === '/api/auth' && method === 'POST') {
    const rl = checkRateLimit('auth:' + ip, 10, 60000);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Too many login attempts', retryAfter: rl.retryAfter }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter), ...SECURITY_HEADERS, ...corsHeaders(request) },
      });
    }
  }
  if (path === '/api/password' && method === 'PUT') {
    const rl = checkRateLimit('password:' + ip, 20, 60000);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests', retryAfter: rl.retryAfter }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter), ...SECURITY_HEADERS, ...corsHeaders(request) },
      });
    }
  }
  const grl = checkRateLimit('general:' + ip, 100, 60000);
  if (!grl.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests', retryAfter: grl.retryAfter }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(grl.retryAfter), ...SECURITY_HEADERS, ...corsHeaders(request) },
    });
  }

  // Body size check
  if (['POST', 'PUT'].includes(method)) {
    const cl = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (cl > MAX_BODY_SIZE) return errorResponse(413);
  }

  // Routes
  let response;
  if (path === '/api/contacts' && method === 'GET') response = await listContacts(env);
  else if (path === '/api/config' && method === 'GET') response = await getConfig(env);
  else if (path === '/api/auth' && method === 'POST') response = await login(request, env);
  else if (path === '/api/password' && method === 'PUT') response = await changePassword(request, env);
  else {
    const m = path.match(/^\/api\/contacts\/([a-z][a-z0-9_-]{0,31})$/);
    if (m) {
      if (method === 'GET') response = await getContact(m[1], env);
      else if (method === 'PUT') response = await updateContact(m[1], request, env);
      else response = errorResponse(405);
    } else {
      response = errorResponse(404);
    }
  }

  const respHeaders = new Headers(response.headers);
  const cors = corsHeaders(request);
  for (const [k, v] of Object.entries(cors)) { if (!respHeaders.has(k)) respHeaders.set(k, v); }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: respHeaders });
}

// ─── Entry Point ─────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    try { return await router(request, env); }
    catch (e) { console.error('Worker error:', e.message); return errorResponse(500); }
  },
};
