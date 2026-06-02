// GET /api/contacts — List all contacts (secure)
import {
  jsonResponse,
  errorResponse,
} from './_security.js';

export async function onRequest(context) {
  const { env, request } = context;

  try {
    const url = new URL(request.url);
    const locality = url.searchParams.get('locality') || null;

    let query;
    let params = [];

    if (locality) {
      // Return global contacts + this locality's contacts
      query = `SELECT id, name, phone, address, maps_query, icon, color, description, updated_at, locality_id
               FROM contacts
               WHERE locality_id IS NULL OR locality_id = ?
               ORDER BY locality_id NULLS FIRST, id`;
      params = [locality];
    } else {
      // Return all contacts
      query = `SELECT id, name, phone, address, maps_query, icon, color, description, updated_at, locality_id
               FROM contacts
               ORDER BY locality_id NULLS FIRST, id`;
    }

    const { results } = await env.DB.prepare(query).bind(...params).all();

    return jsonResponse(results);
  } catch (e) {
    console.error('[Contacts] Error:', e.message);
    return errorResponse('Internal error', 500);
  }
}
