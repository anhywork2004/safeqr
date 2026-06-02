// GET /api/contacts — List all contacts (secure)
import {
  jsonResponse,
  errorResponse,
} from './_security.js';

export async function onRequest(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      'SELECT id, name, phone, address, maps_query, icon, color, description, updated_at FROM contacts ORDER BY id'
    ).all();

    return jsonResponse(results);
  } catch (e) {
    console.error('[Contacts] Error:', e.message);
    return errorResponse('Internal error', 500);
  }
}
