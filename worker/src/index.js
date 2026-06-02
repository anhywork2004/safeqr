// SafeQR API Worker – Cloudflare Workers + D1
// REST API for emergency contacts management

const JWT_EXPIRY = 8 * 60 * 60; // 8 hours

// ─── CORS Headers ──────────────────────────────────────────────
function cors(headers) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    ...headers,
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: cors({ 'Content-Type': 'application/json' }),
  });
}

function error(msg, status = 400) {
  return json({ error: msg }, status);
}

// ─── Simple JWT (HMAC-SHA256 via Web Crypto) ──────────────────
async function createToken(agencyId, agencyName, secret) {
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: agencyId,
    name: agencyName,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY,
  };

  const b64Header = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const b64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const message = `${b64Header}.${b64Payload}`;

  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const b64Sig = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${message}.${b64Sig}`;
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const encoder = new TextEncoder();
    const message = `${parts[0]}.${parts[1]}`;
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    const sig = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(message));
    if (!valid) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7), env.JWT_SECRET);
}

// ─── Password Hashing (SHA-256) ────────────────────────────────
async function hashPassword(pwd) {
  const data = new TextEncoder().encode(pwd);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function verifyPassword(pwd, hash) {
  return (await hashPassword(pwd)) === hash;
}

// ─── Route Handlers ───────────────────────────────────────────

// GET /api/contacts — List all contacts
async function listContacts(env) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, phone, address, maps_query, icon, color, description, updated_at FROM contacts ORDER BY id'
  ).all();
  return json(results);
}

// GET /api/contacts/:id — Get single contact
async function getContact(id, env) {
  const contact = await env.DB.prepare(
    'SELECT id, name, phone, address, maps_query, icon, color, description, updated_at FROM contacts WHERE id = ?'
  ).bind(id).first();
  if (!contact) return error('Contact not found', 404);
  return json(contact);
}

// PUT /api/contacts/:id — Update contact (protected)
async function updateContact(id, req, env) {
  const auth = await requireAuth(req, env);
  if (!auth) return error('Unauthorized', 401);
  if (auth.sub !== id) return error('Forbidden: can only edit your own contact', 403);

  let body;
  try { body = await req.json(); } catch { return error('Invalid JSON'); }

  const fields = [];
  const values = [];
  const allowed = ['phone', 'address', 'maps_query', 'description'];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (fields.length === 0) return error('No valid fields to update');

  fields.push('updated_at = datetime(\'now\')');
  values.push(id);

  await env.DB.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
  return getContact(id, env);
}

// POST /api/auth — Login
async function login(req, env) {
  let body;
  try { body = await req.json(); } catch { return error('Invalid JSON'); }

  const { agencyId, password } = body;
  if (!agencyId || !password) return error('Missing agencyId or password');

  const record = await env.DB.prepare('SELECT password_hash FROM passwords WHERE agency_id = ?').bind(agencyId).first();
  if (!record) return error('Invalid credentials', 401);

  const valid = await verifyPassword(password, record.password_hash);
  if (!valid) return error('Invalid credentials', 401);

  const contact = await env.DB.prepare('SELECT name FROM contacts WHERE id = ?').bind(agencyId).first();
  const token = await createToken(agencyId, contact?.name || agencyId, env.JWT_SECRET);

  return json({ token, agencyId, agencyName: contact?.name });
}

// PUT /api/password — Change password (protected)
async function changePassword(req, env) {
  const auth = await requireAuth(req, env);
  if (!auth) return error('Unauthorized', 401);

  let body;
  try { body = await req.json(); } catch { return error('Invalid JSON'); }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) return error('Missing currentPassword or newPassword');
  if (newPassword.length < 4) return error('New password must be at least 4 characters');

  const record = await env.DB.prepare('SELECT password_hash FROM passwords WHERE agency_id = ?').bind(auth.sub).first();
  if (!record) return error('Agency not found', 404);

  const valid = await verifyPassword(currentPassword, record.password_hash);
  if (!valid) return error('Current password is incorrect', 403);

  const newHash = await hashPassword(newPassword);
  await env.DB.prepare('UPDATE passwords SET password_hash = ? WHERE agency_id = ?').bind(newHash, auth.sub).run();

  return json({ success: true, message: 'Password updated' });
}

// GET /api/config — Get site config
async function getConfig(env) {
  const { results } = await env.DB.prepare('SELECT key, value FROM site_config').all();
  const config = {};
  for (const row of results) config[row.key] = row.value;
  return json(config);
}

// ─── Router ────────────────────────────────────────────────────
async function router(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  // API Routes
  if (path === '/api/contacts' && request.method === 'GET') {
    return listContacts(env);
  }

  const contactMatch = path.match(/^\/api\/contacts\/([a-z]+)$/);
  if (contactMatch) {
    const id = contactMatch[1];
    if (request.method === 'GET') return getContact(id, env);
    if (request.method === 'PUT') return updateContact(id, request, env);
  }

  if (path === '/api/auth' && request.method === 'POST') {
    return login(request, env);
  }

  if (path === '/api/password' && request.method === 'PUT') {
    return changePassword(request, env);
  }

  if (path === '/api/config' && request.method === 'GET') {
    return getConfig(env);
  }

  return error('Not found', 404);
}

// ─── Entry Point ──────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    try {
      return await router(request, env);
    } catch (e) {
      console.error('Worker error:', e);
      return error('Internal server error', 500);
    }
  },
};
