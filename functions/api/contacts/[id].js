// /api/contacts/:id — Get or Update a single contact
const JWT_EXPIRY = 8 * 60 * 60;

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

// GET /api/contacts/:id
export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  try {
    const contact = await env.DB.prepare(
      'SELECT id, name, phone, address, maps_query, icon, color, description, updated_at FROM contacts WHERE id = ?'
    ).bind(id).first();

    if (!contact) return json({ error: 'Contact not found' }, 404);
    return json(contact);
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
}

// PUT /api/contacts/:id
export async function onRequestPut(context) {
  const { request, env, params } = context;
  const id = params.id;

  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const user = await verifyToken(auth.slice(7), env.JWT_SECRET);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (user.sub !== id) return json({ error: 'Forbidden: can only edit your own contact' }, 403);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const fields = [];
    const values = [];
    const allowed = ['phone', 'address', 'maps_query', 'description'];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        fields.push(key + ' = ?');
        values.push(body[key]);
      }
    }

    if (fields.length === 0) return json({ error: 'No valid fields to update' }, 400);

    fields.push("updated_at = datetime('now')");

    await env.DB.prepare('UPDATE contacts SET ' + fields.join(', ') + ' WHERE id = ?').bind(...values, id).run();

    // Return updated contact
    const contact = await env.DB.prepare(
      'SELECT id, name, phone, address, maps_query, icon, color, description, updated_at FROM contacts WHERE id = ?'
    ).bind(id).first();

    return json(contact);
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
}

// OPTIONS (CORS)
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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
