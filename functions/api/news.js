// ============================================================
// SafeQR – News API (Bảng tin)
// ============================================================
// GET    /api/news          — Public: list published posts
// GET    /api/news/:id      — Public: single post detail
// POST   /api/news          — Admin: create post (auth required)
// PUT    /api/news/:id      — Admin: update post (auth required)
// DELETE /api/news/:id      — Admin: delete post (auth required)
// ============================================================

const JWT_EXPIRY = 8 * 60 * 60;

// ── JWT Helpers ──────────────────────────────────────────────

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
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
  } catch { return null; }
}

async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7), env.JWT_SECRET);
}

// ── Helpers ──────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const VALID_CATEGORIES = ['general', 'safety', 'health', 'traffic', 'weather', 'other'];

function validateCategory(cat) {
  return VALID_CATEGORIES.includes(cat) ? cat : 'general';
}

// ── GET /api/news — List published posts ─────────────────────

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const id = params.id;

  // Single post detail
  if (id) {
    try {
      const post = await env.DB.prepare(
        `SELECT n.*, c.name AS agency_name, c.icon AS agency_icon, c.color AS agency_color
         FROM news_posts n LEFT JOIN contacts c ON n.agency_id = c.id
         WHERE n.id = ? AND n.is_published = 1`
      ).bind(id).first();

      if (!post) return json({ error: 'Post not found' }, 404);
      return json(post);
    } catch (e) {
      return json({ error: 'Internal error' }, 500);
    }
  }

  // List posts with optional filters
  const category = url.searchParams.get('category') || '';
  const agencyId = url.searchParams.get('agency') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    let query = `SELECT n.*, c.name AS agency_name, c.icon AS agency_icon, c.color AS agency_color
                 FROM news_posts n LEFT JOIN contacts c ON n.agency_id = c.id
                 WHERE n.is_published = 1`;
    const binds = [];

    if (category && VALID_CATEGORIES.includes(category)) {
      query += ' AND n.category = ?';
      binds.push(category);
    }
    if (agencyId && /^[a-z][a-z0-9_-]{0,31}$/.test(agencyId)) {
      query += ' AND n.agency_id = ?';
      binds.push(agencyId);
    }

    query += ' ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT ? OFFSET ?';
    binds.push(limit, offset);

    const { results } = await env.DB.prepare(query).bind(...binds).all();

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM news_posts WHERE is_published = 1`;
    const countBinds = [];
    if (category && VALID_CATEGORIES.includes(category)) {
      countQuery += ' AND category = ?';
      countBinds.push(category);
    }
    if (agencyId && /^[a-z][a-z0-9_-]{0,31}$/.test(agencyId)) {
      countQuery += ' AND agency_id = ?';
      countBinds.push(agencyId);
    }
    const { total } = await env.DB.prepare(countQuery).bind(...countBinds).first();

    return json({ posts: results, total, limit, offset });
  } catch (e) {
    return json({ error: 'Internal error', detail: e.message }, 500);
  }
}

// ── POST /api/news — Create post (auth required) ─────────────

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const user = await requireAuth(request, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const title = sanitize(String(body.title || '').trim());
  const content = String(body.content || '').trim();
  const summary = sanitize(String(body.summary || '').trim()) || content.substring(0, 200);
  const imageUrl = String(body.image_url || '').trim();
  const category = validateCategory(body.category);
  const isPinned = body.is_pinned ? 1 : 0;

  if (!title) return json({ error: 'Title is required' }, 400);
  if (!content) return json({ error: 'Content is required' }, 400);
  if (title.length > 200) return json({ error: 'Title too long (max 200)' }, 400);
  if (imageUrl && imageUrl.length > 500) return json({ error: 'Image URL too long' }, 400);

  try {
    const result = await env.DB.prepare(
      `INSERT INTO news_posts (agency_id, title, summary, content, image_url, category, is_pinned, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    ).bind(user.sub, title, summary, content, imageUrl, category, isPinned).run();

    const post = await env.DB.prepare('SELECT * FROM news_posts WHERE id = ?').bind(result.meta.last_row_id).first();
    return json({ success: true, post }, 201);
  } catch (e) {
    return json({ error: 'Internal error', detail: e.message }, 500);
  }
}

// ── PUT /api/news/:id — Update post (auth required) ──────────

export async function onRequestPut(context) {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
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

  const user = await requireAuth(request, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const id = params.id;
  if (!id) return json({ error: 'Post ID required' }, 400);

  // Verify ownership
  const existing = await env.DB.prepare('SELECT agency_id FROM news_posts WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'Post not found' }, 404);
  if (existing.agency_id !== user.sub) return json({ error: 'Forbidden: can only edit your own posts' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const fields = [];
  const values = [];

  if (body.title !== undefined) {
    const t = sanitize(String(body.title).trim());
    if (!t) return json({ error: 'Title cannot be empty' }, 400);
    if (t.length > 200) return json({ error: 'Title too long' }, 400);
    fields.push('title = ?');
    values.push(t);
  }
  if (body.content !== undefined) {
    const c = String(body.content).trim();
    if (!c) return json({ error: 'Content cannot be empty' }, 400);
    fields.push('content = ?');
    values.push(c);
  }
  if (body.summary !== undefined) {
    fields.push('summary = ?');
    values.push(sanitize(String(body.summary).trim()));
  }
  if (body.image_url !== undefined) {
    const img = String(body.image_url).trim();
    if (img.length > 500) return json({ error: 'Image URL too long' }, 400);
    fields.push('image_url = ?');
    values.push(img);
  }
  if (body.category !== undefined) {
    fields.push('category = ?');
    values.push(validateCategory(body.category));
  }
  if (body.is_pinned !== undefined) {
    fields.push('is_pinned = ?');
    values.push(body.is_pinned ? 1 : 0);
  }
  if (body.is_published !== undefined) {
    fields.push('is_published = ?');
    values.push(body.is_published ? 1 : 0);
  }

  if (fields.length === 0) return json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");

  try {
    await env.DB.prepare('UPDATE news_posts SET ' + fields.join(', ') + ' WHERE id = ?')
      .bind(...values, id).run();
    const post = await env.DB.prepare(
      `SELECT n.*, c.name AS agency_name, c.icon AS agency_icon
       FROM news_posts n LEFT JOIN contacts c ON n.agency_id = c.id
       WHERE n.id = ?`
    ).bind(id).first();
    return json({ success: true, post });
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
}

// ── DELETE /api/news/:id — Delete post (auth required) ───────

export async function onRequestDelete(context) {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const user = await requireAuth(request, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const id = params.id;
  if (!id) return json({ error: 'Post ID required' }, 400);

  const existing = await env.DB.prepare('SELECT agency_id FROM news_posts WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'Post not found' }, 404);
  if (existing.agency_id !== user.sub) return json({ error: 'Forbidden' }, 403);

  await env.DB.prepare('DELETE FROM news_posts WHERE id = ?').bind(id).run();
  return json({ success: true, message: 'Post deleted' });
}
