// GET /api/contacts — List all contacts
export async function onRequest(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      'SELECT id, name, phone, address, maps_query, icon, color, description, updated_at FROM contacts ORDER BY id'
    ).all();

    return new Response(JSON.stringify(results), {
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
