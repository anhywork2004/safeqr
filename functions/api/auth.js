// POST /api/auth — Login
const JWT_EXPIRY = 8 * 60 * 60; // 8 hours

// Safe base64 encoding that avoids btoa's surrogate-pair limitation
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function createToken(agencyId, agencyName, secret) {
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: agencyId,
    name: agencyName,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY,
  };

  const b64Header = toBase64(encoder.encode(JSON.stringify(header))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const b64Payload = toBase64(encoder.encode(JSON.stringify(payload))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const message = b64Header + '.' + b64Payload;

  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const b64Sig = toBase64(sig).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return message + '.' + b64Sig;
}

async function hashPassword(pwd) {
  const data = new TextEncoder().encode(pwd);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toBase64(hash);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { agencyId, password } = body;
    if (!agencyId || !password) return json({ error: 'Missing agencyId or password' }, 400);

    const record = await env.DB.prepare('SELECT password_hash FROM passwords WHERE agency_id = ?').bind(agencyId).first();
    if (!record) return json({ error: 'Invalid credentials' }, 401);

    const pwdHash = await hashPassword(password);
    if (pwdHash !== record.password_hash) return json({ error: 'Invalid credentials' }, 401);

    const contact = await env.DB.prepare('SELECT name FROM contacts WHERE id = ?').bind(agencyId).first();
    const token = await createToken(agencyId, contact?.name || agencyId, env.JWT_SECRET);

    return json({ token, agencyId, agencyName: contact?.name });
  } catch (e) {
    return json({ error: 'Internal error', detail: e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
