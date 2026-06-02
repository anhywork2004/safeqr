// POST /api/auth — Login (secure)
// Uses PBKDF2 password hashing with automatic legacy hash upgrade.
// Rate limiting is enforced by _middleware.js.
import {
  createToken,
  verifyPassword,
  hashPassword,
  parseBody,
  sanitizeInput,
  validateAgencyId,
  validateStringLength,
  jsonResponse,
  errorResponse,
  handleOptions,
  logRequest,
} from './_security.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Parse and validate request body
    const { data: body, error: parseError } = await parseBody(request);
    if (parseError) return errorResponse(parseError, 400);

    const agencyId = sanitizeInput(String(body.agencyId || ''));
    const password = String(body.password || '');

    // Validate inputs
    if (!validateAgencyId(agencyId)) {
      return errorResponse('Invalid agency ID', 400);
    }
    if (!validateStringLength(password, 4, 128)) {
      return errorResponse('Invalid password', 400);
    }

    // Look up agency in database
    const record = await env.DB.prepare(
      'SELECT password_hash FROM passwords WHERE agency_id = ?'
    ).bind(agencyId).first();

    if (!record) {
      // Use constant-time-ish delay to prevent user enumeration
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + Date.now()));
      return errorResponse('Invalid credentials', 401);
    }

    // Verify password with PBKDF2 (fallback to legacy SHA-256)
    const result = await verifyPassword(password, record.password_hash);

    if (!result.valid) {
      return errorResponse('Invalid credentials', 401);
    }

    // Auto-upgrade legacy hash to PBKDF2
    if (result.needsUpgrade) {
      const newHash = await hashPassword(password);
      await env.DB.prepare(
        'UPDATE passwords SET password_hash = ? WHERE agency_id = ?'
      ).bind(newHash, agencyId).run();
      console.log(`[Auth] Upgraded password hash for agency: ${agencyId}`);
    }

    // Get agency name for token
    const contact = await env.DB.prepare(
      'SELECT name FROM contacts WHERE id = ?'
    ).bind(agencyId).first();

    // Create JWT token
    const token = await createToken(
      agencyId,
      contact?.name || agencyId,
      env.JWT_SECRET
    );

    return jsonResponse({
      token,
      agencyId,
      agencyName: contact?.name || agencyId,
    });
  } catch (e) {
    console.error('[Auth] Error:', e.message);
    return errorResponse('Internal error', 500);
  }
}

export async function onRequestOptions() {
  return handleOptions('POST, OPTIONS');
}
