// ============================================================
// Local Contacts API — CRUD for locality admins
// ============================================================
// POST   /api/local-contacts  — Create a new local contact
// DELETE /api/local-contacts  — Delete a local contact
// Both require JWT auth (locality admin).
// ============================================================
import {
  requireAuth,
  parseBody,
  sanitizeInput,
  jsonResponse,
  errorResponse,
  handleOptions,
  logRequest,
} from './_security.js';

// ─── POST: Create contact ────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const user = await requireAuth(request, env);
    if (!user) return errorResponse('Unauthorized', 401);

    const { data: body, error: parseError } = await parseBody(request, 2048);
    if (parseError) return errorResponse(parseError, 400);

    const name = sanitizeInput(String(body.name || '').trim());
    const phone = String(body.phone || '').trim();
    const address = sanitizeInput(String(body.address || '').trim()).substring(0, 300);
    const mapsQuery = sanitizeInput(String(body.maps_query || body.mapsQuery || '').trim()).substring(0, 200);
    const description = sanitizeInput(String(body.description || '').trim()).substring(0, 500);
    const icon = sanitizeInput(String(body.icon || '📞').trim()).substring(0, 8);
    const color = /^#[0-9a-fA-F]{6}$/.test(body.color || '') ? body.color : '#c62828';

    if (!name || name.length < 2) {
      return errorResponse('Name is required (min 2 characters)', 400);
    }
    if (!/^[\d\s.()-]{3,20}$/.test(phone)) {
      return errorResponse('Invalid phone number format', 400);
    }

    // Generate a friendly ID from locality + name
    const idBase = user.sub + '-' + name.toLowerCase()
      .replace(/[^a-z0-9à-ỹđ]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40);
    const id = idBase + '-' + Math.random().toString(36).substring(2, 6);

    await env.DB.prepare(
      `INSERT INTO contacts (id, name, phone, address, maps_query, icon, color, description, locality_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, name, phone, address, mapsQuery, icon, color, description, user.sub).run();

    logRequest(request, 'local-contact-create');

    return jsonResponse({
      id,
      name,
      phone,
      address,
      maps_query: mapsQuery,
      icon,
      color,
      description,
      locality_id: user.sub,
    }, 201);
  } catch (e) {
    console.error('[LocalContacts POST] Error:', e.message);
    return errorResponse('Internal error', 500);
  }
}

// ─── DELETE: Remove contact ──────────────────────────────────

export async function onRequestDelete(context) {
  const { request, env } = context;

  try {
    const user = await requireAuth(request, env);
    if (!user) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const contactId = url.searchParams.get('id');
    if (!contactId) return errorResponse('Missing contact id parameter', 400);

    // Verify ownership: locality admin can only delete their own contacts
    const contact = await env.DB.prepare(
      'SELECT id, locality_id FROM contacts WHERE id = ?'
    ).bind(contactId).first();

    if (!contact) return errorResponse('Contact not found', 404);
    if (contact.locality_id === null) {
      return errorResponse('Forbidden: cannot delete global contacts', 403);
    }
    if (contact.locality_id !== user.sub) {
      return errorResponse('Forbidden: can only delete your own contacts', 403);
    }

    await env.DB.prepare('DELETE FROM contacts WHERE id = ?').bind(contactId).run();

    logRequest(request, 'local-contact-delete');

    return jsonResponse({ success: true, message: 'Contact deleted' });
  } catch (e) {
    console.error('[LocalContacts DELETE] Error:', e.message);
    return errorResponse('Internal error', 500);
  }
}

export async function onRequestOptions() {
  return handleOptions('POST, DELETE, OPTIONS');
}
