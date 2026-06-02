// GET /api/test — Debug endpoint
export async function onRequest(context) {
  const { env } = context;

  try {
    // Test DB access
    const dbResult = await env.DB.prepare('SELECT 1 as ok').first();

    // Test crypto
    const data = new TextEncoder().encode('test');
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashStr = btoa(String.fromCharCode(...new Uint8Array(hash)));

    // Test env vars
    const jwtSecret = env.JWT_SECRET || 'NOT SET';

    return new Response(JSON.stringify({
      db: dbResult,
      crypto: hashStr ? 'OK' : 'FAIL',
      jwt_secret_prefix: jwtSecret.substring(0, 10) + '...',
      env_keys: Object.keys(env).join(', '),
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
