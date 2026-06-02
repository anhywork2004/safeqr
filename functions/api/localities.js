// GET /api/localities — List available localities (public)
import {
  jsonResponse,
  errorResponse,
  handleOptions,
} from './_security.js';

export async function onRequest(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      'SELECT id, name, district, city FROM localities ORDER BY name'
    ).all();

    return jsonResponse(results || []);
  } catch (e) {
    console.error('[Localities] Error:', e.message);
    return errorResponse('Internal error', 500);
  }
}

export async function onRequestOptions() {
  return handleOptions('GET, OPTIONS');
}
