// ============================================================
// SafeQR API Client (secure)
// ============================================================
// Connects frontend to Cloudflare Pages Functions API.
// Falls back to localStorage if API is unavailable.
// Uses SafeQR_Security for token management when available.
// ============================================================

var API_BASE = '';

// Allow override from localStorage
try {
  var savedBase = localStorage.getItem('safeqr_api_base');
  if (savedBase) API_BASE = savedBase;
} catch(e) {}

// ─── API Helpers ──────────────────────────────────────────────

function apiUrl(path) {
  return (API_BASE || '').replace(/\/$/, '') + path;
}

function apiHeaders(token) {
  var h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

// ─── Token Management ─────────────────────────────────────────

var TOKEN_KEY = 'safeqr_token';

function apiGetToken() {
  try {
    // Use security module if available
    if (window.SafeQR_Security && window.SafeQR_Security.getToken) {
      return window.SafeQR_Security.getToken();
    }
    // Fallback: basic expiry check
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    // Quick expiry check
    try {
      var parts = token.split('.');
      if (parts.length === 3) {
        var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          localStorage.removeItem(TOKEN_KEY);
          return null;
        }
      }
    } catch(e) {}
    return token;
  } catch(e) { return null; }
}

function apiClearToken() {
  try {
    if (window.SafeQR_Security && window.SafeQR_Security.clearToken) {
      window.SafeQR_Security.clearToken();
    }
    localStorage.removeItem(TOKEN_KEY);
  } catch(e) {}
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Fetch all contacts from API.
 * Returns null on failure (caller should use fallback data).
 */
async function apiGetContacts() {
  var url = apiUrl('/api/contacts');
  if (!url) return null;

  try {
    var res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('API getContacts failed:', e.message);
    return null;
  }
}

/**
 * Fetch site config from API.
 */
async function apiGetConfig() {
  var url = apiUrl('/api/config');
  if (!url) return null;

  try {
    var res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('API getConfig failed:', e.message);
    return null;
  }
}

// ─── Auth API ─────────────────────────────────────────────────

/**
 * Login via API.
 * Returns {token, agencyId, agencyName} on success, null on failure.
 */
async function apiLogin(agencyId, password) {
  var url = apiUrl('/api/auth');
  if (!url) return null;

  // Validate inputs before sending
  if (!agencyId || !password) return null;
  if (typeof agencyId !== 'string' || agencyId.length > 64) return null;
  if (typeof password !== 'string' || password.length > 128) return null;

  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        agencyId: agencyId,
        password: password
      })
    });

    if (!res.ok) {
      // Handle rate limiting
      if (res.status === 429) {
        var rateData = await res.json().catch(function() { return {}; });
        console.warn('Rate limited. Retry after:', rateData.retryAfter, 'seconds');
      }
      return null;
    }

    var data = await res.json();

    // Store token securely
    if (data.token) {
      if (window.SafeQR_Security && window.SafeQR_Security.storeToken) {
        window.SafeQR_Security.storeToken(data.token);
      } else {
        localStorage.setItem(TOKEN_KEY, data.token);
      }
    }

    return data;
  } catch (e) {
    console.warn('API login failed:', e.message);
    return null;
  }
}

// ─── Admin API ────────────────────────────────────────────────

/**
 * Update contact via API (requires auth token).
 */
async function apiUpdateContact(agencyId, data) {
  var url = apiUrl('/api/contacts/' + encodeURIComponent(agencyId));
  if (!url) return null;

  var token = apiGetToken();
  if (!token) return null;

  // Sanitize data before sending
  var safeData = {};
  var allowed = ['phone', 'address', 'maps_query', 'description'];
  for (var i = 0; i < allowed.length; i++) {
    var key = allowed[i];
    if (data[key] !== undefined) {
      safeData[key] = String(data[key]).trim().substring(0, 1000);
    }
  }

  try {
    var res = await fetch(url, {
      method: 'PUT',
      headers: apiHeaders(token),
      body: JSON.stringify(safeData)
    });

    if (res.status === 401 || res.status === 403) {
      apiClearToken();
      return null;
    }

    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('API updateContact failed:', e.message);
    return null;
  }
}

/**
 * Change password via API (requires auth token).
 */
async function apiChangePassword(currentPassword, newPassword) {
  var url = apiUrl('/api/password');
  if (!url) return null;

  var token = apiGetToken();
  if (!token) return null;

  // Validate password strength client-side
  if (!newPassword || newPassword.length < 8) {
    return { error: 'New password must be at least 8 characters' };
  }
  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return { error: 'Password must contain both letters and numbers' };
  }

  try {
    var res = await fetch(url, {
      method: 'PUT',
      headers: apiHeaders(token),
      body: JSON.stringify({
        currentPassword: currentPassword,
        newPassword: newPassword
      })
    });

    if (res.status === 401) {
      apiClearToken();
      return { error: 'Session expired. Please login again.' };
    }

    return await res.json();
  } catch (e) {
    console.warn('API changePassword failed:', e.message);
    return null;
  }
}

/**
 * Check if API is available.
 */
async function apiIsAvailable() {
  var url = apiUrl('/api/contacts');
  if (!url) return false;

  try {
    var res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch(e) {
    return false;
  }
}

// ─── Chat API ─────────────────────────────────────────────────

/**
 * Send a message to the AI chat API.
 */
async function apiChat(message) {
  var url = apiUrl('/api/chat');
  if (!url) return null;

  // Sanitize message
  var cleanMsg = String(message || '').trim().substring(0, 500);
  if (!cleanMsg) return null;

  // Use security module's sanitization if available
  if (window.SafeQR_Security && window.SafeQR_Security.sanitizeChatMessage) {
    cleanMsg = window.SafeQR_Security.sanitizeChatMessage(message);
  }

  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ message: cleanMsg })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('API chat failed:', e.message);
    return null;
  }
}

// ─── Emergency Reports API ─────────────────────────────────────

var VALID_EMERGENCY_TYPES = [
  'medical', 'fire', 'police', 'traffic',
  'electrical', 'water', 'other'
];

/**
 * Submit an emergency report to the API.
 * @param {object} data - { emergency_type, latitude, longitude, accuracy, address }
 * @returns {Promise<object|null>} { id, message } on success, null on failure
 */
async function apiPostEmergency(data) {
  var url = apiUrl('/api/emergency');
  if (!url) return null;

  // Validate emergency_type
  if (!data || !data.emergency_type || VALID_EMERGENCY_TYPES.indexOf(data.emergency_type) === -1) {
    console.warn('apiPostEmergency: invalid emergency_type');
    return null;
  }

  // Validate coordinates
  if (typeof data.latitude !== 'number' || isNaN(data.latitude) ||
      data.latitude < -90 || data.latitude > 90) {
    console.warn('apiPostEmergency: invalid latitude');
    return null;
  }
  if (typeof data.longitude !== 'number' || isNaN(data.longitude) ||
      data.longitude < -180 || data.longitude > 180) {
    console.warn('apiPostEmergency: invalid longitude');
    return null;
  }

  // Build safe payload
  var body = {
    emergency_type: data.emergency_type,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: (typeof data.accuracy === 'number' && data.accuracy >= 0) ? data.accuracy : null,
    address: (data.address && typeof data.address === 'string')
      ? data.address.trim().substring(0, 500)
      : null
  };

  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(body)
    });

    if (res.status === 429) {
      console.warn('apiPostEmergency: rate limited');
      return { error: 'rate_limited', message: 'Vui lòng đợi trước khi gửi báo cáo mới.' };
    }

    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('apiPostEmergency failed:', e.message);
    return null;
  }
}

/**
 * Poll for emergency reports (delta polling with since parameter).
 * @param {string|null} since - ISO timestamp for delta polling
 * @param {number} limit - max reports to return (default 50, max 100)
 * @returns {Promise<object|null>} { reports, count, server_time } on success
 */
async function apiGetEmergencies(since, limit) {
  var url = apiUrl('/api/emergency');
  if (!url) return null;

  var params = [];
  if (since && typeof since === 'string') {
    params.push('since=' + encodeURIComponent(since));
  }
  var safeLimit = Math.min(Math.max(limit || 50, 1), 100);
  params.push('limit=' + safeLimit);

  if (params.length > 0) {
    url += '?' + params.join('&');
  }

  try {
    var res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('apiGetEmergencies failed:', e.message);
    return null;
  }
}
