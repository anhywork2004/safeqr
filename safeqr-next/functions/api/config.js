// GET /api/config — Get site configuration (secure)
import {
  jsonResponse,
  errorResponse,
} from './_security.js';

export async function onRequest(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      'SELECT key, value FROM site_config'
    ).all();

    const config = {};
    for (const row of results) {
      config[row.key] = row.value;
    }

    return jsonResponse(config);
  } catch (e) {
    console.error('[Config] Error:', e.message);
    return errorResponse('Internal error', 500);
  }
}
