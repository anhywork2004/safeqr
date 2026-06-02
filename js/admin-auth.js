// ============================================================
// SafeQR – Admin Authentication (secure)
// ============================================================
// Primary: JWT-based API authentication with PBKDF2 hashing.
// Fallback: Local password comparison (offline mode only).
// Uses SafeQR_Security for session management when available.
// ============================================================

var SESSION_KEY = 'safeqr_session';
var CONTACTS_KEY = 'safeqr_contacts';
var PASSWORDS_KEY = 'safeqr_passwords';

// Get custom passwords from localStorage or defaults
function getPasswords() {
  try {
    var saved = localStorage.getItem(PASSWORDS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_PASSWORDS;
  } catch (e) {
    return DEFAULT_PASSWORDS;
  }
}

function findContact(agencyId) {
  if (!agencyId || typeof agencyId !== 'string') return null;
  return emergencyContacts.find(function(c) { return c.id === agencyId; });
}

function showToast(msg, isError) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function () { toast.classList.remove('show'); }, 3000);
}

// ─── Session Management ────────────────────────────────────

function createSessionObj(agencyId, agencyName, useApi) {
  // Use security module if available
  if (window.SafeQR_Security && window.SafeQR_Security.createSession) {
    var session = window.SafeQR_Security.createSession(agencyId, agencyName);
    session.useApi = !!useApi;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  // Fallback session
  var session = {
    agencyId: agencyId,
    agencyName: agencyName,
    loginTime: Date.now(),
    useApi: !!useApi,
    sessionId: 'legacy_' + Math.random().toString(36).substring(2),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

// ─── Login Handler ─────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  var agency = document.getElementById('agency').value;
  var password = document.getElementById('password').value;
  var btn = document.querySelector('.btn-login');

  if (!agency || !password) {
    showToast('Vui lòng chọn đơn vị và nhập mật khẩu', true);
    return;
  }

  // Validate agency ID format
  if (window.SafeQR_Security && window.SafeQR_Security.isValidAgencyId) {
    if (!window.SafeQR_Security.isValidAgencyId(agency)) {
      showToast('Đơn vị không hợp lệ', true);
      return;
    }
  }

  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập...';

  // — Primary: API login with PBKDF2 + JWT —
  var apiResult = await apiLogin(agency, password);
  if (apiResult && apiResult.token) {
    var contact = findContact(agency);
    createSessionObj(agency, contact ? contact.name : agency, true);
    showToast('Đăng nhập thành công! Đang chuyển hướng...');
    setTimeout(function () { window.location.href = 'dashboard.html'; }, 300);
    return;
  }

  // If API returned an error (not null = network failure), show it
  if (apiResult && apiResult.error) {
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
    showToast(apiResult.error, true);
    return;
  }

  // — Fallback: Local auth (offline mode) —
  // ⚠️  This compares against passwords shipped in the JS bundle.
  // Only used when the API is completely unreachable.
  console.warn('[SafeQR] API không khả dụng, dùng xác thực local (offline).');
  btn.textContent = 'API không khả dụng, thử offline...';

  var passwords = getPasswords();
  var expected = passwords[agency];

  if (!expected) {
    showToast('Không tìm thấy thông tin đơn vị.', true);
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
    return;
  }

  // Constant-time comparison to mitigate timing attacks
  if (!timingSafeEqual(password, expected)) {
    // Add a small random delay to prevent brute-force timing
    await randomDelay(50, 150);
    showToast('Mật khẩu không đúng. Vui lòng kiểm tra lại.', true);
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
    return;
  }

  var contact = findContact(agency);
  createSessionObj(agency, contact ? contact.name : agency, false);

  showToast('⚠️ Đăng nhập offline. Vui lòng đổi mật khẩu khi có kết nối API.');
  setTimeout(function () { window.location.href = 'dashboard.html'; }, 500);
}

// ─── Security Helpers ──────────────────────────────────────

/**
 * Constant-time string comparison to mitigate timing attacks.
 * All characters are always compared, regardless of length difference.
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  var len = Math.max(a.length, b.length);
  var result = 0;

  for (var i = 0; i < len; i++) {
    var charA = i < a.length ? a.charCodeAt(i) : 0;
    var charB = i < b.length ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }

  return result === 0 && a.length === b.length;
}

/**
 * Delay for a random amount of milliseconds.
 * Used to add jitter to auth operations.
 */
function randomDelay(minMs, maxMs) {
  var ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

// ─── Bind Login Form ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
  await loadData();
  var form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }

  // Warn if passwords.json was loaded (should be changed immediately)
  if (DEFAULT_PASSWORDS && Object.keys(DEFAULT_PASSWORDS).length > 0) {
    console.warn(
      '[SafeQR] ⚠️  %cCẢNH BÁO BẢO MẬT:%c Mật khẩu mặc định đã được tải. ' +
      'Vui lòng đổi tất cả mật khẩu ngay sau khi đăng nhập. ' +
      'Không sử dụng mật khẩu mặc định trong production.',
      'font-weight:bold;color:#c62828;', ''
    );
  }
});
