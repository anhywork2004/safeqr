// PUT /api/password — Change password
const JWT_EXPIRY = 8 * 60 * 60;

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const encoder = new TextEncoder();
    const message = parts[0] + '.' + parts[1];
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

async function hashPassword(pwd) {
  const data = new TextEncoder().encode(pwd);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toBase64(hash);
}

export async function onRequestPut(context) {
  const { request, env } = context;

  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const user = await verifyToken(auth.slice(7), env.JWT_SECRET);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) return json({ error: 'Missing currentPassword or newPassword' }, 400);
    if (newPassword.length < 4) return json({ error: 'New password must be at least 4 characters' }, 400);

    const record = await env.DB.prepare('SELECT password_hash FROM passwords WHERE agency_id = ?').bind(user.sub).first();
    if (!record) return json({ error: 'Agency not found' }, 404);

    const pwdHash = await hashPassword(currentPassword);
    if (pwdHash !== record.password_hash) return json({ error: 'Current password is incorrect' }, 403);

    const newHash = await hashPassword(newPassword);
    await env.DB.prepare('UPDATE passwords SET password_hash = ? WHERE agency_id = ?').bind(newHash, user.sub).run();

    return json({ success: true, message: 'Password updated' });
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
