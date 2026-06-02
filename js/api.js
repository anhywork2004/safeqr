// SafeQR API Client
// Connects frontend to Cloudflare Worker API
// Falls back to localStorage if API is unavailable

// API base URL - empty string = same domain (via Pages Functions)
// Set to your Worker URL for external deployments
var API_BASE = '';

// Allow override from localStorage
try {
  var savedBase = localStorage.getItem('safeqr_api_base');
  if (savedBase) API_BASE = savedBase;
} catch(e) {}

// ─── API Helpers ──────────────────────────────────────────────

function apiUrl(path) {
  // Empty API_BASE means same-domain (Pages Functions)
  return (API_BASE || '').replace(/\/$/, '') + path;
}

function apiHeaders(token) {
  var h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

// ─── Public API ───────────────────────────────────────────────

// Fetch all contacts from API
async function apiGetContacts() {
  var url = apiUrl('/api/contacts');
  if (!url) return null;

  try {
    var res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('API getContacts failed:', e);
    return null;
  }
}

// Fetch site config from API
async function apiGetConfig() {
  var url = apiUrl('/api/config');
  if (!url) return null;

  try {
    var res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('API getConfig failed:', e);
    return null;
  }
}

// ─── Auth API ─────────────────────────────────────────────────

// Login via API
async function apiLogin(agencyId, password) {
  var url = apiUrl('/api/auth');
  if (!url) return null;

  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ agencyId: agencyId, password: password })
    });
    if (!res.ok) return null;
    var data = await res.json();
    // Store token
    if (data.token) {
      localStorage.setItem('safeqr_token', data.token);
    }
    return data;
  } catch (e) {
    console.warn('API login failed:', e);
    return null;
  }
}

function apiGetToken() {
  try {
    return localStorage.getItem('safeqr_token');
  } catch(e) { return null; }
}

function apiClearToken() {
  try { localStorage.removeItem('safeqr_token'); } catch(e) {}
}

// ─── Admin API ────────────────────────────────────────────────

// Update contact via API (requires auth token)
async function apiUpdateContact(agencyId, data) {
  var url = apiUrl('/api/contacts/' + agencyId);
  if (!url) return null;
  var token = apiGetToken();

  try {
    var res = await fetch(url, {
      method: 'PUT',
      headers: apiHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('API updateContact failed:', e);
    return null;
  }
}

// Change password via API (requires auth token)
async function apiChangePassword(currentPassword, newPassword) {
  var url = apiUrl('/api/password');
  if (!url) return null;
  var token = apiGetToken();

  try {
    var res = await fetch(url, {
      method: 'PUT',
      headers: apiHeaders(token),
      body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
    });
    return await res.json();
  } catch (e) {
    console.warn('API changePassword failed:', e);
    return null;
  }
}

// Check if API is available
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

async function apiChat(message) {
  var url = apiUrl('/api/chat');
  if (!url) return null;

  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ message: message })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('API chat failed:', e);
    return null;
  }
}
