// ============================================================
// SafeQR – Data Loader (JSON-first with offline fallback)
// ============================================================
// All data is stored in /data/*.json files.
// This script fetches those files and populates global variables.
// If fetch fails (offline / file:// protocol / CORS), hardcoded
// fallback values are used so the app still works everywhere.
//
// ⚠️  SECURITY NOTE:
// DEFAULT_PASSWORDS are shipped to the browser as an offline
// fallback. This is acceptable ONLY because:
//   (a) The API enforces JWT auth + PBKDF2 hashing as primary,
//   (b) Local auth is a fallback when API is unreachable,
//   (c) All default passwords MUST be changed on first login.
// In a production deployment, consider removing local auth
// fallback entirely and requiring API availability.
// ============================================================

// ── Fallback data (used when JSON files can't be loaded) ────

var _FALLBACK_SITE_CONFIG = {
  appName: 'SafeQR – QR Khẩn Cấp',
  tagline: 'Quét nhanh, hỗ trợ kịp thời',
  locality: 'TP. Thủ Đức, TP. Hồ Chí Minh',
  sosPhone: '112',
  version: '1.0.0'
};

var _FALLBACK_CONTACTS = [
  { id: 'medical',  name: 'Cấp cứu y tế',        phone: '115',       address: 'Bệnh viện Đa khoa khu vực Thủ Đức\n64 Lê Văn Việt, P. Hiệp Phú',     mapsQuery: 'Bệnh viện gần nhất',          icon: '🚑', color: '#e74c3c', description: 'Gọi cấp cứu khi có tai nạn, đột quỵ, khó thở, chấn thương nặng.' },
  { id: 'fire',     name: 'Cảnh sát PCCC & CNCH', phone: '114',       address: 'Đội PCCC Thủ Đức\n6A Đường số 12, P. Linh Trung',                mapsQuery: 'Trạm cứu hỏa gần nhất',        icon: '🚒', color: '#e67e22', description: 'Gọi khi xảy ra cháy nổ, sập nhà, cứu nạn trong đám cháy.' },
  { id: 'police',   name: 'Công an địa phương',   phone: '113',       address: 'Công an phường sở tại\nLiên hệ theo địa bàn cư trú',             mapsQuery: 'Công an phường gần đây',       icon: '👮', color: '#2c3e50', description: 'Gọi khi cần hỗ trợ an ninh, trộm cắp, tai nạn giao thông.' },
  { id: 'electricity', name: 'Điện lực',          phone: '19001006',  address: 'Điện lực Thủ Đức\n72 Võ Văn Ngân, P. Bình Thọ',               mapsQuery: 'Điện lực gần nhất',            icon: '⚡', color: '#f39c12', description: 'Báo sự cố điện: chập điện, đứt dây, mất điện kéo dài.' },
  { id: 'water',    name: 'Cấp nước',             phone: '19001047',  address: 'Công ty Cấp nước Thủ Đức\nSố 2 Đường số 8, P. Linh Xuân',       mapsQuery: 'Công ty cấp nước gần nhất',     icon: '💧', color: '#3498db', description: 'Báo vỡ đường ống, rò rỉ nước, mất nước đột ngột.' },
  { id: 'ward',     name: 'Đường dây nóng UBND phường', phone: '19001133', address: 'UBND phường sở tại\nLiên hệ theo địa bàn cư trú',         mapsQuery: 'UBND phường gần đây',          icon: '🆘', color: '#9b59b6', description: 'Phản ánh khẩn cấp về an ninh trật tự, sự cố hạ tầng, cứu trợ.' }
];

var _FALLBACK_EXTERNAL = [
  { name: 'Tổng đài khẩn cấp quốc gia', phone: '112' },
  { name: 'Bảo vệ dân phòng', phone: '069.2348560' },
  { name: 'Cứu hộ giao thông', phone: '19008099' },
  { name: 'Đường dây nóng Bộ Y tế', phone: '1900.9095' }
];

// ⚠️  SECURITY: These are DEFAULT passwords only.
// All passwords MUST be changed on first login.
// The API uses PBKDF2 salted hashing as the primary auth mechanism.
var _FALLBACK_PASSWORDS = {
  medical: 'medical2024',
  fire: 'fire2024',
  police: 'police2024',
  electricity: 'electricity2024',
  water: 'water2024',
  ward: 'ward2024'
};

// ── Global data variables (populated by loadData) ──────────

var SITE_CONFIG = _FALLBACK_SITE_CONFIG;
var emergencyContacts = _FALLBACK_CONTACTS;
var externalEmergencyNumbers = _FALLBACK_EXTERNAL;
var DEFAULT_PASSWORDS = _FALLBACK_PASSWORDS;

// ── Async loader ───────────────────────────────────────────

var _dataLoaded = false;
var _dataLoadPromise = null;

/**
 * Fetch and parse a JSON file. Returns null on any failure.
 */
async function _fetchJSON(path) {
  try {
    // Sanitize path to prevent path traversal
    var safePath = path.replace(/\.\./g, '').replace(/\/\//g, '/');
    var resp = await fetch(safePath);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    return null;
  }
}

/**
 * Load all data from JSON files.
 * Called once by the app on startup. Safe to call multiple times —
 * subsequent calls return the same cached promise.
 *
 * After the promise resolves, the global variables SITE_CONFIG,
 * emergencyContacts, externalEmergencyNumbers, and DEFAULT_PASSWORDS
 * are guaranteed to contain the best available data.
 *
 * @returns {Promise<boolean>} true if JSON loaded, false if fallback used
 */
function loadData() {
  if (_dataLoadPromise) return _dataLoadPromise;

  _dataLoadPromise = (async function () {
    // Load all JSON files in parallel
    var results = await Promise.all([
      _fetchJSON('data/site-config.json'),
      _fetchJSON('data/contacts.json'),
      _fetchJSON('data/external-numbers.json'),
      _fetchJSON('data/passwords.json')
    ]);

    var config    = results[0];
    var contacts  = results[1];
    var external  = results[2];
    var passwords = results[3];

    var allLoaded = !!(config && contacts && external && passwords);

    if (config)    SITE_CONFIG              = config;
    if (contacts)  emergencyContacts        = contacts;
    if (external)  externalEmergencyNumbers = external;
    if (passwords) DEFAULT_PASSWORDS        = passwords;

    _dataLoaded = allLoaded;

    console.log(
      allLoaded
        ? '[SafeQR] Dữ liệu load từ JSON thành công.'
        : '[SafeQR] Một số file JSON không load được, dùng fallback.'
    );

    // Warn if passwords JSON was loaded (these should be changed)
    if (passwords) {
      console.warn(
        '[SafeQR] ⚠️  Cảnh báo bảo mật: File passwords.json đã được tải. ' +
        'Vui lòng đổi tất cả mật khẩu mặc định ngay sau lần đăng nhập đầu tiên. ' +
        'API sẽ dùng PBKDF2 để hash mật khẩu mới.'
      );
    }

    return allLoaded;
  })();

  return _dataLoadPromise;
}
