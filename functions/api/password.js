// PUT /api/password — Change password (secure)
// Requires valid JWT. Uses PBKDF2 for new passwords.
// Rate limiting is enforced by _middleware.js.
import {
  requireAuth,
  verifyPassword,
  hashPassword,
  parseBody,
  sanitizeInput,
  validateStringLength,
  jsonResponse,
  errorResponse,
  handleOptions,
} from './_security.js';

export async function onRequestPut(context) {
  const { request, env } = context;

  try {
    // Authenticate
    const user = await requireAuth(request, env);
    if (!user) return errorResponse('Unauthorized', 401);

    // Parse and validate body
    const { data: body, error: parseError } = await parseBody(request);
    if (parseError) return errorResponse(parseError, 400);

    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return errorResponse('Missing currentPassword or newPassword', 400);
    }
    if (!validateStringLength(newPassword, 8, 128)) {
      return errorResponse('New password must be between 8 and 128 characters', 400);
    }
    if (newPassword === currentPassword) {
      return errorResponse('New password must be different from current password', 400);
    }

    // Password strength check
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return errorResponse('Password must contain both letters and numbers', 400);
    }

    // Look up current password from localities table
    const record = await env.DB.prepare(
      'SELECT password_hash FROM localities WHERE id = ?'
    ).bind(user.sub).first();

    if (!record) return errorResponse('Locality not found', 404);

    // Verify current password (supports legacy SHA-256)
    const result = await verifyPassword(currentPassword, record.password_hash);
    if (!result.valid) {
      return errorResponse('Current password is incorrect', 403);
    }

    // Hash new password with PBKDF2
    const newHash = await hashPassword(newPassword);
    await env.DB.prepare(
      'UPDATE localities SET password_hash = ? WHERE id = ?'
    ).bind(newHash, user.sub).run();

    return jsonResponse({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (e) {
    console.error('[Password] Error:', e.message);
    return errorResponse('Internal error', 500);
  }
}

export async function onRequestOptions() {
  return handleOptions('PUT, OPTIONS');
}
