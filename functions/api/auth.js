// POST /api/auth — Login for locality admins (secure)
// Uses PBKDF2 password hashing with automatic legacy hash upgrade.
// Rate limiting is enforced by _middleware.js.
import {
  createToken,
  verifyPassword,
  hashPassword,
  parseBody,
  sanitizeInput,
  validateStringLength,
  jsonResponse,
  errorResponse,
  handleOptions,
  logRequest,
} from './_security.js';

// Locality ID validation: lowercase start, alphanumeric + hyphens
const LOCALITY_ID_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;

function validateLocalityId(id) {
  if (typeof id !== 'string') return false;
  return LOCALITY_ID_PATTERN.test(id);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { data: body, error: parseError } = await parseBody(request);
    if (parseError) return errorResponse(parseError, 400);

    const localityId = sanitizeInput(String(body.localityId || ''));
    const password = String(body.password || '');

    if (!validateLocalityId(localityId)) {
      return errorResponse('Invalid locality ID', 400);
    }
    if (!validateStringLength(password, 4, 128)) {
      return errorResponse('Invalid password', 400);
    }

    // Look up locality in database
    const record = await env.DB.prepare(
      'SELECT id, name, district, city, password_hash FROM localities WHERE id = ?'
    ).bind(localityId).first();

    if (!record) {
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + Date.now()));
      return errorResponse('Invalid credentials', 401);
    }

    // Verify password
    const result = await verifyPassword(password, record.password_hash);

    if (!result.valid) {
      return errorResponse('Invalid credentials', 401);
    }

    // Auto-upgrade legacy hash
    if (result.needsUpgrade) {
      const newHash = await hashPassword(password);
      await env.DB.prepare(
        'UPDATE localities SET password_hash = ? WHERE id = ?'
      ).bind(newHash, localityId).run();
      console.log(`[Auth] Upgraded password hash for locality: ${localityId}`);
    }

    // Create JWT token
    const localityName = record.name;
    const token = await createToken(
      localityId,
      localityName,
      env.JWT_SECRET
    );

    return jsonResponse({
      token,
      localityId,
      localityName,
      district: record.district || '',
      city: record.city || '',
    });
  } catch (e) {
    console.error('[Auth] Error:', e.message);
    return errorResponse('Internal error', 500);
  }
}

export async function onRequestOptions() {
  return handleOptions('POST, OPTIONS');
}
