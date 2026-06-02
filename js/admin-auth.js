// ============================================================
// SafeQR – Admin Auth (Locality-based)
// ============================================================
// Login with locality + password. Session stored in sessionStorage.
// API-first authentication with offline fallback.
// ============================================================

var SESSION_KEY = 'safeqr_session';
var CONTACTS_KEY = 'safeqr_contacts';
var PASSWORDS_KEY = 'safeqr_passwords';

// ─── Fallback localities (offline mode) ──────────────────────

var _FALLBACK_LOCALITIES = [
  { id: 'phuong-hiep-phu', name: 'Phường Hiệp Phú', district: 'TP. Thủ Đức', city: 'TP. Hồ Chí Minh' },
  { id: 'phuong-linh-trung', name: 'Phường Linh Trung', district: 'TP. Thủ Đức', city: 'TP. Hồ Chí Minh' },
  { id: 'phuong-binh-tho', name: 'Phường Bình Thọ', district: 'TP. Thủ Đức', city: 'TP. Hồ Chí Minh' },
];

// ─── Locality Dropdown ───────────────────────────────────────

async function loadLocalityDropdown() {
  var select = document.getElementById('locality');
  if (!select) return;

  var localities = null;
  try { localities = await apiGetLocalities(); } catch(e) {}

  if (!localities || !localities.length) {
    localities = _FALLBACK_LOCALITIES;
  }

  select.innerHTML = '<option value="">— Chọn địa phương —</option>';
  for (var j = 0; j < localities.length; j++) {
    var l = localities[j];
    var label = '📍 ' + l.name;
    if (l.district) label += ' - ' + l.district;
    if (l.city) label += ', ' + l.city;
    select.innerHTML += '<option value="' + escapeHtmlAttr(l.id) + '">' + escapeHtml(label) + '</option>';
  }
}

function escapeHtmlAttr(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── Toast ───────────────────────────────────────────────────

function showToast(msg, isError) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  if (isError) toast.classList.add('error');
  else toast.classList.remove('error');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function() {
    toast.classList.remove('show', 'error');
  }, 3000);
}

// ─── Session ─────────────────────────────────────────────────

function createSessionObj(data) {
  return {
    localityId: data.localityId,
    localityName: data.localityName,
    district: data.district || '',
    city: data.city || '',
    loginTime: Date.now(),
    useApi: data.useApi !== false,
    sessionId: 'legacy_' + Math.random().toString(36).substring(2, 10),
  };
}

// ─── Login Handler ───────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();

  var localityId = document.getElementById('locality').value.trim();
  var password = document.getElementById('password').value.trim();

  if (!localityId || !password) {
    showToast('Vui lòng chọn địa phương và nhập mật khẩu', true);
    return;
  }

  showToast('Đang đăng nhập...');

  // Primary: API login
  var apiResult = await apiLogin(localityId, password);

  if (apiResult && apiResult.token) {
    var session = createSessionObj({
      localityId: apiResult.localityId || localityId,
      localityName: apiResult.localityName || localityId,
      district: apiResult.district || '',
      city: apiResult.city || '',
      useApi: true,
    });
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    if (window.SafeQR_Security && window.SafeQR_Security.createSession) {
      window.SafeQR_Security.createSession(session.localityId, session.localityName, true);
    }

    showToast('✅ Đăng nhập thành công!');
    setTimeout(function() { window.location.href = 'dashboard.html'; }, 300);
    return;
  }

  // Fallback: local password check (offline)
  var passwords = getLocalPasswords();
  var expectedPwd = passwords[localityId] || DEFAULT_PASSWORDS ? DEFAULT_PASSWORDS[localityId] : null;

  // Find locality name from fallback list
  var locName = localityId;
  for (var i = 0; i < _FALLBACK_LOCALITIES.length; i++) {
    if (_FALLBACK_LOCALITIES[i].id === localityId) {
      locName = _FALLBACK_LOCALITIES[i].name;
      break;
    }
  }

  if (expectedPwd && timingSafeEqual(password, expectedPwd)) {
    var localSession = createSessionObj({
      localityId: localityId,
      localityName: locName,
      useApi: false,
    });
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(localSession));
    showToast('✅ Đăng nhập thành công (ngoại tuyến)!');
    setTimeout(function() { window.location.href = 'dashboard.html'; }, 500);
    return;
  }

  // Random delay to deter brute force
  await randomDelay(50, 150);
  showToast('Sai địa phương hoặc mật khẩu', true);
}

// ─── Helpers ─────────────────────────────────────────────────

function getLocalPasswords() {
  try {
    return JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}');
  } catch(e) { return {}; }
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  var result = 0;
  var len = Math.max(a.length, b.length);
  for (var i = 0; i < len; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return result === 0 && a.length === b.length;
}

function randomDelay(min, max) {
  return new Promise(function(r) {
    setTimeout(r, min + Math.floor(Math.random() * (max - min)));
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── Init ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function() {
  await loadData();
  loadLocalityDropdown();
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
});
