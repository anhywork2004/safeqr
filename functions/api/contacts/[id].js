// /api/contacts/:id — Get or Update a single contact (secure)
import {
  requireAuth,
  parseBody,
  sanitizeInput,
  validateAgencyId,
  jsonResponse,
  errorResponse,
  handleOptions,
} from '../_security.js';

// GET /api/contacts/:id — Public
export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  try {
    // Validate ID format
    if (!validateAgencyId(id)) {
      return errorResponse('Invalid contact ID', 400);
    }

    const contact = await env.DB.prepare(
      'SELECT id, name, phone, address, maps_query, icon, color, description, updated_at FROM contacts WHERE id = ?'
    ).bind(id).first();

    if (!contact) return errorResponse('Contact not found', 404);
    return jsonResponse(contact);
  } catch (e) {
    console.error(`[Contacts:${id}] GET Error:`, e.message);
    return errorResponse('Internal error', 500);
  }
}

// PUT /api/contacts/:id — Protected (requires JWT)
export async function onRequestPut(context) {
  const { request, env, params } = context;
  const id = params.id;

  try {
    // Validate ID format
    if (!validateAgencyId(id)) {
      return errorResponse('Invalid contact ID', 400);
    }

    // Authenticate
    const user = await requireAuth(request, env);
    if (!user) return errorResponse('Unauthorized', 401);

    // Look up the contact to check ownership
    const contact = await env.DB.prepare(
      'SELECT locality_id FROM contacts WHERE id = ?'
    ).bind(id).first();

    if (!contact) return errorResponse('Contact not found', 404);

    // Global contacts (locality_id IS NULL) cannot be edited by locality admins
    if (contact.locality_id === null) {
      return errorResponse('Forbidden: global contacts cannot be modified', 403);
    }

    // Authorization: locality admin can only edit contacts for their locality
    if (user.sub !== contact.locality_id) {
      return errorResponse('Forbidden: can only edit contacts in your locality', 403);
    }

    // Parse and validate body
    const { data: body, error: parseError } = await parseBody(request);
    if (parseError) return errorResponse(parseError, 400);

    // Sanitize and validate each field
    const allowed = ['phone', 'address', 'maps_query', 'description'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        let value = String(body[key]).trim();

        // Sanitize to prevent XSS
        value = sanitizeInput(value);

        // Field-specific validation
        if (key === 'phone') {
          if (!/^[\d\s.()-]{3,20}$/.test(value)) {
            return errorResponse('Invalid phone number format', 400);
          }
        }
        if (key === 'address' && value.length > 500) {
          return errorResponse('Address too long (max 500 characters)', 400);
        }
        if (key === 'maps_query' && value.length > 200) {
          return errorResponse('Maps query too long (max 200 characters)', 400);
        }
        if (key === 'description' && value.length > 1000) {
          return errorResponse('Description too long (max 1000 characters)', 400);
        }

        fields.push(key + ' = ?');
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    fields.push("updated_at = datetime('now')");

    await env.DB.prepare(
      'UPDATE contacts SET ' + fields.join(', ') + ' WHERE id = ?'
    ).bind(...values, id).run();

    // Return updated contact
    const updatedContact = await env.DB.prepare(
      'SELECT id, name, phone, address, maps_query, icon, color, description, updated_at FROM contacts WHERE id = ?'
    ).bind(id).first();

    return jsonResponse(updatedContact);
  } catch (e) {
    console.error(`[Contacts:${id}] PUT Error:`, e.message);
    return errorResponse('Internal error', 500);
  }
}

// OPTIONS (CORS preflight)
export async function onRequestOptions() {
  return handleOptions('GET, PUT, OPTIONS');
}
