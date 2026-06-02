// ============================================================
// Emergency Reports API
// ============================================================
// POST /api/emergency  — Submit an emergency report (public)
// GET  /api/emergency  — Poll emergency reports (public, delta)
// ============================================================
import {
  parseBody,
  sanitizeInput,
  jsonResponse,
  errorResponse,
  handleOptions,
  getClientIP,
  logRequest,
  checkRateLimit,
} from './_security.js';

// Allowed emergency types
const VALID_TYPES = new Set([
  'medical', 'fire', 'police', 'traffic',
  'electrical', 'water', 'other',
]);

// Rate limit: 5 reports per 5 minutes per IP for POST
const REPORT_RATE_LIMIT = 5;
const REPORT_RATE_WINDOW = 5 * 60 * 1000; // 5 min

/**
 * Validate latitude (must be a number between -90 and 90).
 */
function isValidLatitude(v) {
  return typeof v === 'number' && !isNaN(v) && v >= -90 && v <= 90;
}

/**
 * Validate longitude (must be a number between -180 and 180).
 */
function isValidLongitude(v) {
  return typeof v === 'number' && !isNaN(v) && v >= -180 && v <= 180;
}

/**
 * POST — Submit an emergency report.
 */
async function handlePost(request, env) {
  const ip = getClientIP(request);
  logRequest(request, 'emergency-post');

  // Rate limit
  const limit = checkRateLimit('emergency-post:' + ip, REPORT_RATE_LIMIT, REPORT_RATE_WINDOW);
  if (!limit.allowed) {
    return errorResponse('Too many requests', 429, 'Vui lòng đợi ' + limit.retryAfter + ' giây trước khi gửi báo cáo mới.');
  }

  // Parse body
  const { data, error } = await parseBody(request, 4096);
  if (error) {
    return errorResponse('Invalid request body', 400, error);
  }
  if (!data || typeof data !== 'object') {
    return errorResponse('Missing request body', 400);
  }

  // Validate emergency_type
  const { emergency_type, latitude, longitude, accuracy, address } = data;
  if (!emergency_type || !VALID_TYPES.has(emergency_type)) {
    return errorResponse(
      'Invalid emergency type',
      400,
      'Loại tình huống không hợp lệ. Chọn một trong: ' + [...VALID_TYPES].join(', ')
    );
  }

  // Validate coordinates
  if (!isValidLatitude(latitude)) {
    return errorResponse('Invalid latitude', 400, 'Vĩ độ phải là số từ -90 đến 90.');
  }
  if (!isValidLongitude(longitude)) {
    return errorResponse('Invalid longitude', 400, 'Kinh độ phải là số từ -180 đến 180.');
  }

  // Validate accuracy (optional, must be positive number if provided)
  let safeAccuracy = null;
  if (accuracy !== undefined && accuracy !== null) {
    if (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy < 0 || accuracy > 1000) {
      return errorResponse('Invalid accuracy', 400, 'Độ chính xác phải là số dương (mét).');
    }
    safeAccuracy = accuracy;
  }

  // Sanitize address (optional, max 500 chars)
  let safeAddress = null;
  if (address && typeof address === 'string') {
    safeAddress = sanitizeInput(address.trim()).substring(0, 500);
  }

  // Generate report ID
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const userAgent = (request.headers.get('User-Agent') || '').substring(0, 500);

  // Insert into D1
  try {
    await env.DB.prepare(
      `INSERT INTO emergency_reports
       (id, emergency_type, latitude, longitude, accuracy, address, reporter_ip, user_agent, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, emergency_type, latitude, longitude, safeAccuracy, safeAddress, ip, userAgent, now, expiresAt)
      .run();

    return jsonResponse(
      {
        id,
        message: 'Báo cáo khẩn cấp đã được gửi thành công. Lực lượng hỗ trợ sẽ phản hồi sớm nhất.',
      },
      201
    );
  } catch (e) {
    console.error('[Emergency POST] DB error:', e.message);
    return errorResponse('Internal error', 500);
  }
}

/**
 * GET — Poll emergency reports (delta polling supported).
 */
async function handleGet(request, env) {
  logRequest(request, 'emergency-get');

  const url = new URL(request.url);
  const since = url.searchParams.get('since') || null;
  const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
  const limit = Math.min(Math.max(limitParam || 50, 1), 100);

  try {
    let query;
    let params = [];

    if (since) {
      // Delta poll: return reports newer than `since` that haven't expired
      query = `SELECT id, emergency_type, latitude, longitude, accuracy, address, created_at
               FROM emergency_reports
               WHERE created_at > ? AND expires_at > datetime('now')
               ORDER BY created_at DESC
               LIMIT ?`;
      params = [since, limit];
    } else {
      // Initial load: return most recent active reports
      query = `SELECT id, emergency_type, latitude, longitude, accuracy, address, created_at
               FROM emergency_reports
               WHERE expires_at > datetime('now')
               ORDER BY created_at DESC
               LIMIT ?`;
      params = [limit];
    }

    const { results } = await env.DB.prepare(query).bind(...params).all();

    // Probabilistic cleanup: ~2% of GET requests delete expired reports
    if (Math.random() < 0.02) {
      env.DB.prepare(
        "DELETE FROM emergency_reports WHERE expires_at < datetime('now')"
      ).run().catch(() => {});
    }

    return jsonResponse({
      reports: results || [],
      count: results ? results.length : 0,
      server_time: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[Emergency GET] DB error:', e.message);
    return errorResponse('Internal error', 500);
  }
}

// ─── Main Router ──────────────────────────────────────────────

export async function onRequest(context) {
  const { request } = context;

  switch (request.method) {
    case 'OPTIONS':
      return handleOptions('GET, POST, OPTIONS');
    case 'POST':
      return handlePost(request, context.env);
    case 'GET':
      return handleGet(request, context.env);
    default:
      return errorResponse('Method not allowed', 405);
  }
}
