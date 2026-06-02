// GET /api/config — Get site configuration
export async function onRequest(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare('SELECT key, value FROM site_config').all();
    const config = {};
    for (const row of results) config[row.key] = row.value;

    return new Response(JSON.stringify(config), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
