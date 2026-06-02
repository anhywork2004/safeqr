var _apiContactsCache = null;

// ============================================================
// LOCATION MODULE — Reverse Geocoding with Nominatim (OSM)
// ============================================================
// Free API, no key required. Converts GPS → readable address.
// Respects Nominatim 1 req/sec rate limit.
// Caches result: 2 min fresh, 30 min fallback via localStorage.

var _userLocation = null;      // { lat, lng, accuracy, address, timestamp }
var _geoPending = false;

/**
 * Convert GPS coordinates to a human-readable address.
 * Uses Nominatim (OpenStreetMap) — FREE, no API key, supports tiếng Việt.
 * Rate limit policy: 1 request per second (enforced).
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>}
 */
async function reverseGeocode(lat, lng) {
  // Respect Nominatim's 1 req/sec rate limit
  if (window.__lastGeoRequest) {
    var elapsed = Date.now() - window.__lastGeoRequest;
    if (elapsed < 1100) {
      await new Promise(function(r) { setTimeout(r, 1100 - elapsed); });
    }
  }
  window.__lastGeoRequest = Date.now();

  try {
    var url = 'https://nominatim.openstreetmap.org/reverse?' +
      'format=json' +
      '&lat=' + encodeURIComponent(lat) +
      '&lon=' + encodeURIComponent(lng) +
      '&zoom=18' +
      '&addressdetails=1' +
      '&accept-language=vi';

    var resp = await fetch(url, {
      headers: {
        'User-Agent': 'SafeQR-Emergency-App/1.0 (safeqr.io)',
      },
    });

    if (!resp.ok) return null;

    var data = await resp.json();

    // Primary: use display_name (full address in Vietnamese)
    if (data && data.display_name) {
      return data.display_name;
    }

    // Fallback: build short address from components
    if (data && data.address) {
      var a = data.address;
      var parts = [];
      if (a.house_number) parts.push(a.house_number);
      if (a.road)         parts.push(a.road);
      if (a.suburb)       parts.push(a.suburb);
      if (a.city_district || a.district) parts.push(a.city_district || a.district);
      if (a.city || a.town || a.municipality) parts.push(a.city || a.town || a.municipality);
      if (a.state)        parts.push(a.state);
      if (parts.length > 0) return parts.join(', ');
    }

    return null;
  } catch (e) {
    console.warn('[Location] Reverse geocode failed:', e.message);
    return null;
  }
}

/**
 * Build human-readable location text with Google Maps link.
 */
function buildLocationText(lat, lng, address) {
  var mapsLink = 'https://www.google.com/maps?q=' + lat + ',' + lng;
  var text = '📍 Vị trí của tôi:\n';

  if (address) {
    var shortAddr = address.length > 120
      ? address.substring(0, 117) + '...'
      : address;
    text += shortAddr + '\n\n';
  }

  text += '🗺 Bản đồ: ' + mapsLink;
  return text;
}

/**
 * Get user's position with reverse-geocoded street address.
 * Caches: 2 min for fresh address, 30 min via localStorage.
 * @returns {Promise<object|null>} { lat, lng, accuracy, address, timestamp }
 */
async function getDetailedPosition() {
  // Return cached if fresh
  if (_userLocation) {
    var age = Date.now() - _userLocation.timestamp;
    if (_userLocation.address && age < 120000) return _userLocation;
    if (age < 10000) return _userLocation;
  }

  if (_geoPending) return _userLocation;
  _geoPending = true;

  return new Promise(function(resolve) {
    if (!navigator.geolocation) {
      _geoPending = false;
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async function(pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;

        var address = null;
        try { address = await reverseGeocode(lat, lng); } catch(e) {}

        _userLocation = {
          lat: lat,
          lng: lng,
          accuracy: pos.coords.accuracy,
          address: address,
          timestamp: Date.now(),
        };

        // Persist to localStorage for offline/quick reuse (30-min cache)
        try {
          localStorage.setItem('safeqr_location', JSON.stringify({
            lat: lat, lng: lng, address: address, timestamp: Date.now(),
          }));
        } catch(e) {}

        _geoPending = false;
        updateLocationDisplay();
        resolve(_userLocation);
      },
      function(err) {
        console.warn('[Location] GPS error:', err && err.message);
        var cached = _loadCachedLocation();
        _geoPending = false;

        // Show error state in UI
        var el = document.getElementById('userLocation');
        if (el) {
          if (err && err.code === 1) {
            // PERMISSION_DENIED
            el.innerHTML = '<span class="loc-dot denied"></span><span class="loc-text">📍 Vui lòng cấp quyền vị trí trong trình duyệt</span>';
          } else if (err && err.code === 2) {
            // POSITION_UNAVAILABLE
            el.innerHTML = '<span class="loc-dot denied"></span><span class="loc-text">📍 Không thể xác định vị trí</span>';
          } else if (err && err.code === 3) {
            // TIMEOUT
            el.innerHTML = '<span class="loc-dot denied"></span><span class="loc-text">📍 Quá thời gian định vị, thử lại</span>';
          } else {
            el.innerHTML = '<span class="loc-dot denied"></span><span class="loc-text">📍 Không định vị được, chạm để thử lại</span>';
          }
          el.className = 'location-banner error';
        }
        resolve(cached);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  });
}

function _loadCachedLocation() {
  try {
    var raw = localStorage.getItem('safeqr_location');
    if (!raw) return null;
    var c = JSON.parse(raw);
    if (!c || !c.lat || !c.lng) return null;
    if (Date.now() - c.timestamp > 1800000) return null; // 30 min expiry
    _userLocation = {
      lat: c.lat, lng: c.lng, accuracy: null,
      address: c.address || null, timestamp: c.timestamp,
    };
    return _userLocation;
  } catch(e) { return null; }
}

/**
 * Update the on-screen location indicator.
 */
function updateLocationDisplay() {
  var el = document.getElementById('userLocation');
  if (!el) return;

  if (!_userLocation) {
    el.innerHTML = '<span class="loc-dot pulse"></span><span class="loc-text">Đang xác định vị trí...</span>';
    el.className = 'location-banner loading';
    return;
  }

  if (_userLocation.address) {
    // Build a short, street-level address — most relevant for "nearby" feel
    var addr = _userLocation.address;
    // Try to extract street + ward/district level (first 2-3 comma parts)
    var parts = addr.split(',');
    var short = parts.slice(0, Math.min(3, parts.length)).join(',');
    if (short.length < 15 && parts.length >= 4) {
      short = parts.slice(0, 4).join(',');
    }
    el.innerHTML = '<span class="loc-dot active"></span><span class="loc-label">📍 Bạn đang ở gần</span> <strong>' + escapeHtml(short) + '</strong>';
    el.className = 'location-banner located';

    // Also update the hero locality text from GPS address
    updateHeroLocality(addr);
  } else {
    el.innerHTML = '<span class="loc-dot active"></span><span class="loc-text">📍 ' +
      _userLocation.lat.toFixed(5) + ', ' + _userLocation.lng.toFixed(5) + '</span>';
    el.className = 'location-banner coords-only';
  }
}

/**
 * Extract district/city level from full address and update the hero-desc locality span.
 * E.g., "64 Lê Văn Việt, P. Hiệp Phú, TP. Thủ Đức, TP. Hồ Chí Minh, Vietnam"
 * → "P. Hiệp Phú, TP. Thủ Đức, TP. Hồ Chí Minh"
 */
function updateHeroLocality(address) {
  var localityEl = document.getElementById('locality');
  if (!localityEl || !address) return;

  var parts = address.split(',').map(function(p) { return p.trim(); });

  // Filter to only administrative units (skip street numbers, Vietnam country name)
  var adminKeywords = ['tp.', 'thành phố', 'quận', 'huyện', 'phường', 'xã', 'thị trấn',
                       'thị xã', 'p.', 'q.', 'h.', 'tx.'];
  var adminParts = [];
  for (var i = 0; i < parts.length; i++) {
    var lower = parts[i].toLowerCase();
    // Skip pure street addresses (contain numbers at start or are just road names)
    // Skip "Vietnam" / "Việt Nam"
    if (lower === 'vietnam' || lower === 'việt nam') continue;

    var isAdmin = false;
    for (var j = 0; j < adminKeywords.length; j++) {
      if (lower.indexOf(adminKeywords[j]) === 0) {
        isAdmin = true;
        break;
      }
    }
    // Also include parts that look like district/city names (short, no house numbers)
    if (isAdmin || (parts[i].length > 2 && !/^\d/.test(parts[i]) && adminParts.length > 0)) {
      adminParts.push(parts[i]);
    }
  }

  // Take the most relevant parts (last 2-3 admin units)
  var locality;
  if (adminParts.length >= 2) {
    // Take the last 2-3 that are most relevant (city/district level)
    var relevant = [];
    for (var k = 0; k < adminParts.length; k++) {
      var l = adminParts[k].toLowerCase();
      if (l.indexOf('tp.') === 0 || l.indexOf('thành phố') === 0 ||
          l.indexOf('quận') === 0 || l.indexOf('huyện') === 0 ||
          l.indexOf('thị xã') === 0 || l.indexOf('tỉnh') === 0) {
        relevant.push(adminParts[k]);
      }
    }
    // If not enough city-level parts, include ward/commune level
    if (relevant.length < 2) {
      relevant = adminParts.slice(-3);
    }
    locality = relevant.slice(-3).join(', ');
  } else if (adminParts.length === 1) {
    locality = adminParts[0];
  } else {
    // Fallback: take last 2-3 comma parts
    locality = parts.slice(-3).filter(function(p) {
      return p.toLowerCase() !== 'vietnam' && p.toLowerCase() !== 'việt nam';
    }).join(', ');
  }

  if (locality && locality.length > 3) {
    localityEl.textContent = locality;
  }
}

/**
 * Manual location refresh (called on banner click).
 */
async function refreshLocation() {
  var el = document.getElementById('userLocation');
  if (el) {
    el.innerHTML = '<span class="loc-dot pulse"></span>Đang làm mới vị trí...';
    el.className = 'location-banner loading';
  }
  _userLocation = null;
  try { localStorage.removeItem('safeqr_location'); } catch(e) {}
  var pos = await getDetailedPosition();
  if (pos && pos.address) {
    showToast('📍 Đã cập nhật vị trí chính xác');
  } else if (pos) {
    showToast('📍 Đã lấy tọa độ GPS');
  } else {
    showToast('⚠️ Không thể định vị. Hãy bật GPS và cấp quyền vị trí.', true);
  }
}

function initLocation() {
  _loadCachedLocation();
  updateLocationDisplay();
  getDetailedPosition().catch(function() {}); // background

  var el = document.getElementById('userLocation');
  if (el) {
    el.addEventListener('click', refreshLocation);
    el.title = 'Nhấn để cập nhật vị trí chính xác';
  }
}

// ============================================================
// CONTACTS
// ============================================================

function getMergedContacts() {
  try {
    var saved = JSON.parse(localStorage.getItem('safeqr_contacts') || '{}');
  } catch (e) {
    var saved = {};
  }

  // Use API data if available, merged with localStorage overrides
  var baseContacts = emergencyContacts;
  if (_apiContactsCache && _apiContactsCache.length > 0) {
    var apiMap = {};
    for (var i = 0; i < _apiContactsCache.length; i++) {
      apiMap[_apiContactsCache[i].id] = _apiContactsCache[i];
    }
    baseContacts = emergencyContacts.map(function (c) {
      if (apiMap[c.id]) {
        var a = apiMap[c.id];
        return {
          id: c.id,
          name: a.name || c.name,
          phone: a.phone || c.phone,
          address: a.address || c.address,
          mapsQuery: a.maps_query || c.mapsQuery,
          icon: c.icon,
          color: a.color || c.color,
          description: a.description || c.description
        };
      }
      return c;
    });
  }

  return baseContacts.map(function (c) {
    if (saved[c.id]) {
      var merged = {};
      var keys = Object.keys(c);
      for (var i = 0; i < keys.length; i++) { merged[keys[i]] = c[keys[i]]; }
      merged.phone = saved[c.id].phone || c.phone;
      merged.address = saved[c.id].address || c.address;
      merged.mapsQuery = saved[c.id].mapsQuery || c.mapsQuery;
      merged.description = saved[c.id].description || c.description;
      return merged;
    }
    return c;
  });
}

async function initApp() {
  // Load data from JSON files (with offline fallback)
  await loadData();

  // Try loading from Cloudflare API first (same-domain Pages Functions or external Worker)
  // API_BASE defaults to '' which means same-domain → apiUrl() returns correct paths
  try {
    var apiContacts = await apiGetContacts();
    if (apiContacts && apiContacts.length > 0) {
      _apiContactsCache = apiContacts;
    }
    var apiConfig = await apiGetConfig();
    if (apiConfig && apiConfig.locality) {
      document.getElementById('locality').textContent = apiConfig.locality;
    } else {
      document.getElementById('locality').textContent = SITE_CONFIG.locality;
    }
  } catch (e) {
    console.warn('API init failed, using local data');
    document.getElementById('locality').textContent = SITE_CONFIG.locality;
  }

  renderCards();
  renderExtraNumbers();
  initLocation();         // ← Start GPS + reverse geocoding
  registerSW();
  setupDraggableButtons();
  setupSOS();
  setupKeyboard();

  // Re-render grid on resize (column count may change)
  var _resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(function () {
      var grid = document.getElementById('cardGrid');
      var total = getMergedContacts().length;
      var cols = calcColumns(total, getMaxCols());
      grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    }, 200);
  });
}

function setupKeyboard() {
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closePhoneModal();
    }
  });
}

document.addEventListener('DOMContentLoaded', initApp);

/**
 * Calculate optimal column count for balanced rows.
 *  6 → 3+3 (2 rows × 3 cols)    7 → 4+3 (2 rows, first wider)
 *  8 → 4+4 (2 rows × 4 cols)    9 → 3+3+3 (3 rows × 3 cols)
 * @param {number} total - Number of cards
 * @param {number} maxCols - Max columns (based on viewport)
 * @returns {number} Optimal column count
 */
function calcColumns(total, maxCols) {
  if (total <= 0) return 1;
  var rows = Math.ceil(total / maxCols);
  return Math.ceil(total / rows);
}

function getMaxCols() {
  var w = window.innerWidth;
  if (w < 400) return 2;
  if (w < 600) return 3;
  return 4;
}

function renderCards() {
  var contacts = getMergedContacts();
  var grid = document.getElementById('cardGrid');
  var total = contacts.length;
  var maxCols = getMaxCols();
  var cols = calcColumns(total, maxCols);

  // Dynamically set grid columns
  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';

  grid.innerHTML = contacts.map(function (c) {
    return '<div class="card" style="--card-color: ' + c.color + '">' +
      '<div class="card-icon">' + c.icon + '</div>' +
      '<div class="card-name">' + c.name + '</div>' +
      '<div class="card-desc">' + c.description + '</div>' +
      '<div class="card-phone">' + escapeHtml(c.phone) + '</div>' +
      '<div class="card-address" title="' + escapeHtml(c.address) + '">' + escapeHtml(c.address) + '</div>' +
      '<div class="card-actions">' +
        '<button class="btn btn-call" onclick="handleCall(\'' + escapeHtml(c.phone) + '\',\'' + escapeHtml(c.name) + '\',\'' + c.color + '\')">📞 Gọi</button>' +
        '<button class="btn btn-maps" onclick="openMaps(\'' + escapeHtml(c.mapsQuery) + '\')">🗺 Chỉ đường</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderExtraNumbers() {
  var list = document.getElementById('extraList');
  list.innerHTML = externalEmergencyNumbers.map(function (n) {
    return '<li>' +
      '<span class="extra-name">' + escapeHtml(n.name) + '</span>' +
      '<button class="extra-phone" onclick="handleCall(\'' + escapeHtml(n.phone) + '\',\'' + escapeHtml(n.name) + '\',\'#c62828\')">' + escapeHtml(n.phone) + '</button>' +
    '</li>';
  }).join('');
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

var _phoneModalCurrentNumber = '';

function handleCall(phone, name, color) {
  var cleanPhone = phone.replace(/[\.\s]/g, '');

  if (isMobileDevice()) {
    window.location.href = 'tel:' + cleanPhone;
    return;
  }

  // Desktop / laptop: show modal with phone number
  _phoneModalCurrentNumber = cleanPhone;

  var modal = document.getElementById('phoneModal');
  var icon = document.getElementById('phoneModalIcon');
  var nameEl = document.getElementById('phoneModalName');
  var numEl = document.getElementById('phoneModalNumber');

  // Get icon from contacts data
  var contact = null;
  for (var i = 0; i < emergencyContacts.length; i++) {
    if (emergencyContacts[i].phone.replace(/[\.\s]/g, '') === cleanPhone) {
      contact = emergencyContacts[i];
      break;
    }
  }

  if (icon) icon.textContent = contact ? contact.icon : '📞';
  if (nameEl) nameEl.textContent = name;
  if (numEl) {
    numEl.textContent = cleanPhone;
    numEl.style.color = color || '#c62828';
  }
  if (modal) modal.classList.add('visible');
}

function closePhoneModal() {
  var modal = document.getElementById('phoneModal');
  if (modal) modal.classList.remove('visible');
}

function closePhoneModalOnOverlay(event) {
  if (event.target === document.getElementById('phoneModal')) {
    closePhoneModal();
  }
}

function copyPhoneNumber() {
  var input = document.createElement('textarea');
  input.value = _phoneModalCurrentNumber;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  showToast('Đã sao chép: ' + _phoneModalCurrentNumber);
  closePhoneModal();
}

// ============================================================
// MAPS — Uses user's exact location + address
// ============================================================

function openMaps(query) {
  showToast('Đang định vị vị trí của bạn...');

  if (!navigator.geolocation) {
    openMapsFallback(query);
    return;
  }

  // Try to get detailed position (with address)
  getDetailedPosition().then(function(pos) {
    var lat, lng;
    if (pos) {
      lat = pos.lat;
      lng = pos.lng;
    } else {
      // Last resort: unknown origin
      openMapsFallback(query);
      return;
    }

    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    var encoded = encodeURIComponent(query);
    var url = 'https://www.google.com/maps/dir/?api=1'
      + '&origin=' + lat + ',' + lng
      + '&destination=' + encoded
      + '&travelmode=driving';

    if (isMobile) {
      var geoUri = 'geo:' + lat + ',' + lng + '?q=' + encoded;
      var started = Date.now();
      window.location.href = geoUri;
      setTimeout(function () {
        if (Date.now() - started < 2000) {
          window.open(url, '_blank');
        }
      }, 800);
    } else {
      window.open(url, '_blank');
    }
  }).catch(function() {
    openMapsFallback(query);
  });
}

function openMapsFallback(query) {
  var encoded = encodeURIComponent(query);
  var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  showToast('Không lấy được vị trí, tìm kiếm chung...');

  if (isMobile) {
    var geoUri = 'geo:0,0?q=' + encoded;
    var started = Date.now();
    window.location.href = geoUri;
    setTimeout(function () {
      if (Date.now() - started < 2000) {
        window.open('https://www.google.com/maps/search/?api=1&query=' + encoded, '_blank');
      }
    }, 800);
  } else {
    window.open('https://www.google.com/maps/search/?api=1&query=' + encoded, '_blank');
  }
}

// ============================================================
// SHARE LOCATION — Emergency type selection + GPS + API submit
// ============================================================

var _selectedEmergencyType = null;

var EMERGENCY_TYPE_SHORT = {
  medical: 'Y tế', fire: 'Hỏa hoạn', police: 'Công an',
  traffic: 'Giao thông', electrical: 'Sự cố điện',
  water: 'Sự cố nước', other: 'Sự cố khác'
};

/**
 * Now opens the emergency type selector modal first.
 * After type selection, proceeds to GPS + API submission.
 */
function shareLocation() {
  if (!navigator.geolocation) {
    showToast('Thiết bị không hỗ trợ định vị', true);
    return;
  }
  // Close SOS actions menu
  toggleSOS();
  // Open emergency type selector
  openEmergencyModal();
}

// ─── Emergency Modal ──────────────────────────────────────────

function openEmergencyModal() {
  var modal = document.getElementById('emergencyModal');
  if (modal) modal.classList.add('visible');
  // Reset selection state
  _selectedEmergencyType = null;
  var buttons = document.querySelectorAll('.emergency-type-btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('selected');
  }
}

function closeEmergencyModal() {
  var modal = document.getElementById('emergencyModal');
  if (modal) modal.classList.remove('visible');
  _selectedEmergencyType = null;
}

function closeEmergencyModalOnOverlay(event) {
  if (event.target === document.getElementById('emergencyModal')) {
    closeEmergencyModal();
  }
}

function selectEmergencyType(type) {
  _selectedEmergencyType = type;
  // Highlight selected button, dim others
  var buttons = document.querySelectorAll('.emergency-type-btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.toggle('selected', buttons[i].dataset.type === type);
  }
  // Proceed after brief visual feedback
  setTimeout(function() {
    closeEmergencyModal();
    submitEmergencyReport(type);
  }, 280);
}

// ─── Emergency Report Submission ──────────────────────────────

async function submitEmergencyReport(type) {
  showToast('Đang lấy vị trí chính xác...');

  var pos = await getDetailedPosition();
  if (!pos) {
    showToast('⚠️ Không lấy được vị trí. Vui lòng bật GPS và thử lại.', true);
    return;
  }

  // Accuracy check: warn if > 15 meters
  if (pos.accuracy && pos.accuracy > 15) {
    var warn = document.getElementById('accuracyWarning');
    warn.textContent = '⚠️ Độ chính xác GPS thấp (' + pos.accuracy.toFixed(1) + 'm). Vị trí có thể không chính xác.';
    warn.classList.add('show');
    setTimeout(function() { warn.classList.remove('show'); }, 4500);
  }

  showToast('Đang gửi báo cáo khẩn cấp...');

  var result = await apiPostEmergency({
    emergency_type: type,
    latitude: pos.lat,
    longitude: pos.lng,
    accuracy: pos.accuracy,
    address: pos.address
  });

  var typeShort = EMERGENCY_TYPE_SHORT[type] || type;
  var link = 'https://www.google.com/maps?q=' + pos.lat + ',' + pos.lng;

  if (result && result.id) {
    showToast('✅ Đã gửi báo cáo ' + typeShort + ' thành công! Lực lượng hỗ trợ sẽ phản hồi.');

    // Also copy location to clipboard as backup
    var text = pos.address
      ? '📍 [' + typeShort + '] Vị trí khẩn cấp: ' + pos.address + '\n🗺 ' + link
      : '📍 [' + typeShort + '] Vị trí của tôi: ' + link;
    copyToClipboard(text);
  } else if (result && result.error === 'rate_limited') {
    showToast('⚠️ Bạn gửi quá nhanh. Vui lòng đợi vài phút.', true);
    // Still help with clipboard fallback
    fallbackShareToClipboard(pos, type);
  } else {
    showToast('⚠️ Không gửi được báo cáo. Đã sao chép vị trí vào bộ nhớ tạm.', true);
    fallbackShareToClipboard(pos, type);
  }
}

// ─── Clipboard Helpers ────────────────────────────────────────

function copyToClipboard(text) {
  try {
    var input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  } catch(e) {}
}

/**
 * Fallback: copy location to clipboard + open Google Maps.
 * Used when API is unreachable or rate-limited.
 */
function fallbackShareToClipboard(pos, type) {
  var link = 'https://www.google.com/maps?q=' + pos.lat + ',' + pos.lng;
  var typeShort = EMERGENCY_TYPE_SHORT[type] || (type || '');
  var prefix = typeShort ? '📍 [' + typeShort + '] ' : '📍 ';
  var text = pos.address
    ? prefix + 'Vị trí khẩn cấp: ' + pos.address + '\n🗺 ' + link
    : prefix + 'Vị trí của tôi: ' + link;

  copyToClipboard(text);
  showToast('✅ Đã sao chép vị trí + địa chỉ. Hãy gửi cho người hỗ trợ.');
  window.open(link, '_blank');
}

function toggleSOS() {
  var actions = document.getElementById('sosActions');
  var btn = document.getElementById('sosBtn');

  if (actions.classList.contains('visible')) {
    actions.classList.remove('visible');
    btn.style.animationPlayState = 'running';
  } else {
    actions.classList.add('visible');
    btn.style.animationPlayState = 'paused';
  }
}

function showToast(msg, isError) {
  var toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  if (isError) {
    toast.classList.add('error');
  } else {
    toast.classList.remove('error');
  }
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function() {
    toast.classList.remove('show');
    toast.classList.remove('error');
  }, 2800);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function() {});
  }
}

// ========== DRAGGABLE FLOATING BUTTONS ==========

var _dragState = null;

function setupDraggable(containerId, btnId, panelId, defaultSide) {
  var container = document.getElementById(containerId);
  var btn = document.getElementById(btnId);
  if (!container || !btn) return null;

  var btnWidth = containerId === 'sosContainer' ? 60 : 56;
  var edgeGap = 16;
  var storageKey = 'safeqr_float_' + containerId;

  // Load saved position
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch(e) {}
  var side = (saved && saved.side) || defaultSide;
  var savedBottom = (saved && saved.bottom) || 24;

  function getLeftForSide(s) {
    if (s === 'left') return edgeGap;
    return window.innerWidth - btnWidth - edgeGap;
  }

  function getSideFromLeft(l) {
    var center = l + btnWidth / 2;
    return center < window.innerWidth / 2 ? 'left' : 'right';
  }

  function updatePositionClass(l) {
    var s = getSideFromLeft(l);
    container.classList.toggle('on-left', s === 'left');
    container.classList.toggle('on-right', s === 'right');

    // Update panel position class
    if (panelId) {
      var panel = document.getElementById(panelId);
      if (panel) {
        panel.classList.toggle('panel-left', s === 'left');
        panel.classList.toggle('panel-right', s === 'right');
      }
    }
    return s;
  }

  function savePosition(l, b) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ side: getSideFromLeft(l), bottom: b }));
    } catch(e) {}
  }

  // Initialize position — JS controls all positioning via inline styles
  var initialLeft = getLeftForSide(side);
  container.style.left = initialLeft + 'px';
  container.style.right = 'auto';
  container.style.top = 'auto';
  container.style.bottom = savedBottom + 'px';
  updatePositionClass(initialLeft);

  function onStart(e) {
    // Don't drag if interacting with children (actions, input, etc.)
    if (e.target !== btn && !btn.contains(e.target)) return;
    e.preventDefault();
    // Close any open panels when starting to drag
    var panel = document.getElementById('chatPanel');
    if (panel && panel.classList.contains('visible')) panel.classList.remove('visible');
    var actions = document.getElementById('sosActions');
    if (actions && actions.classList.contains('visible')) {
      actions.classList.remove('visible');
      var sosBtnEl = document.getElementById('sosBtn');
      if (sosBtnEl) sosBtnEl.style.animationPlayState = 'running';
    }
    var touch = e.touches ? e.touches[0] : e;
    var rect = container.getBoundingClientRect();
    _dragState = {
      container: container,
      btn: btn,
      btnWidth: btnWidth,
      edgeGap: edgeGap,
      panelId: panelId,
      startX: touch.clientX,
      startY: touch.clientY,
      startLeft: rect.left,
      startBottom: parseFloat(container.style.bottom) || savedBottom,
      hasMoved: false,
      moveThreshold: 5,
      containerId: containerId
    };
    container.classList.add('dragging');
  }

  // Global move handler
  if (!window.__dragMoveBound) {
    window.__dragMoveBound = true;
    document.addEventListener('mousemove', function(e) {
      if (!_dragState) return;
      var dx = e.clientX - _dragState.startX;
      var dy = e.clientY - _dragState.startY;
      if (!_dragState.hasMoved && (Math.abs(dx) > _dragState.moveThreshold || Math.abs(dy) > _dragState.moveThreshold)) {
        _dragState.hasMoved = true;
      }
      if (!_dragState.hasMoved) return;
      e.preventDefault();
      var newLeft = _dragState.startLeft + dx;
      var newBottom = _dragState.startBottom - dy;
      var maxLeft = window.innerWidth - _dragState.btnWidth - _dragState.edgeGap;
      var minLeft = _dragState.edgeGap;
      var maxBottom = window.innerHeight - _dragState.btnWidth - _dragState.edgeGap - 10;
      var minBottom = _dragState.edgeGap;
      newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
      newBottom = Math.max(minBottom, Math.min(maxBottom, newBottom));
      _dragState.container.style.left = newLeft + 'px';
      _dragState.container.style.right = 'auto';
      _dragState.container.style.bottom = newBottom + 'px';
      _dragState.container.style.top = 'auto';
      updatePositionClass(newLeft);
    });
    document.addEventListener('mouseup', function(e) {
      if (!_dragState) return;
      var container = _dragState.container;
      var panelId = _dragState.panelId;
      var currentLeft = parseFloat(container.style.left);
      var currentBottom = parseFloat(container.style.bottom);
      var side = updatePositionClass(currentLeft);
      var snapLeft = currentLeft;
      // Snap to nearest edge
      var center = currentLeft + _dragState.btnWidth / 2;
      if (center < window.innerWidth / 2) {
        snapLeft = _dragState.edgeGap;
      } else {
        snapLeft = window.innerWidth - _dragState.btnWidth - _dragState.edgeGap;
      }
      container.style.left = snapLeft + 'px';
      container.style.right = 'auto';
      container.classList.remove('dragging');
      updatePositionClass(snapLeft);
      savePosition(snapLeft, currentBottom);
      if (_dragState.hasMoved) { window.__dragJustEnded = Date.now(); }
      _dragState = null;
    });
    document.addEventListener('touchmove', function(e) {
      if (!_dragState) return;
      var touch = e.touches[0];
      var dx = touch.clientX - _dragState.startX;
      var dy = touch.clientY - _dragState.startY;
      if (!_dragState.hasMoved && (Math.abs(dx) > _dragState.moveThreshold || Math.abs(dy) > _dragState.moveThreshold)) {
        _dragState.hasMoved = true;
      }
      if (!_dragState.hasMoved) return;
      e.preventDefault();
      var newLeft = _dragState.startLeft + dx;
      var newBottom = _dragState.startBottom - dy;
      var maxLeft = window.innerWidth - _dragState.btnWidth - _dragState.edgeGap;
      var minLeft = _dragState.edgeGap;
      var maxBottom = window.innerHeight - _dragState.btnWidth - _dragState.edgeGap - 10;
      var minBottom = _dragState.edgeGap;
      newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
      newBottom = Math.max(minBottom, Math.min(maxBottom, newBottom));
      _dragState.container.style.left = newLeft + 'px';
      _dragState.container.style.right = 'auto';
      _dragState.container.style.bottom = newBottom + 'px';
      _dragState.container.style.top = 'auto';
      updatePositionClass(newLeft);
    }, {passive: false});
    document.addEventListener('touchend', function(e) {
      if (!_dragState) return;
      var container = _dragState.container;
      var panelId = _dragState.panelId;
      var currentLeft = parseFloat(container.style.left);
      var currentBottom = parseFloat(container.style.bottom);
      var center = currentLeft + _dragState.btnWidth / 2;
      var edgeGap = _dragState.edgeGap;
      var snapLeft;
      if (center < window.innerWidth / 2) {
        snapLeft = edgeGap;
      } else {
        snapLeft = window.innerWidth - _dragState.btnWidth - edgeGap;
      }
      container.style.left = snapLeft + 'px';
      container.style.right = 'auto';
      container.classList.remove('dragging');
      updatePositionClass(snapLeft);
      savePosition(snapLeft, currentBottom);
      if (_dragState.hasMoved) { window.__dragJustEnded = Date.now(); }
      _dragState = null;
    });
  }

  // Bind start events
  btn.addEventListener('mousedown', onStart);
  btn.addEventListener('touchstart', onStart, {passive: false});

  // Handle window resize
  window.addEventListener('resize', function() {
    var currentLeft = parseFloat(container.style.left);
    var currentBottom = parseFloat(container.style.bottom) || savedBottom;
    var s = getSideFromLeft(currentLeft);
    var snapLeft = getLeftForSide(s);
    container.style.left = snapLeft + 'px';
    container.style.right = 'auto';
    container.style.bottom = currentBottom + 'px';
    container.style.top = 'auto';
    updatePositionClass(snapLeft);
  });

  return {
    getSide: function() {
      return getSideFromLeft(parseFloat(container.style.left) || initialLeft);
    }
  };
}

var _sosDraggable = null;
var _chatDraggable = null;

function setupDraggableButtons() {
  _sosDraggable = setupDraggable('sosContainer', 'sosBtn', null, 'right');
  _chatDraggable = setupDraggable('chatContainer', 'chatBtn', 'chatPanel', 'left');
}

function setupSOS() {
  var sosBtn = document.getElementById('sosBtn');
  if (sosBtn) {
    sosBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      // Skip click after drag
      if (window.__dragJustEnded && Date.now() - window.__dragJustEnded < 300) return;
      toggleSOS();
    });
  }

  // Close SOS menu on outside click
  document.addEventListener('click', function (e) {
    var sosContainer = document.getElementById('sosContainer');
    var actions = document.getElementById('sosActions');
    if (sosContainer && !sosContainer.contains(e.target) && actions.classList.contains('visible')) {
      actions.classList.remove('visible');
      document.getElementById('sosBtn').style.animationPlayState = 'running';
    }
  });

  // Close chat on outside click
  document.addEventListener('click', function (e) {
    var chatContainer = document.getElementById('chatContainer');
    var panel = document.getElementById('chatPanel');
    if (chatContainer && !chatContainer.contains(e.target) && panel.classList.contains('visible')) {
      panel.classList.remove('visible');
    }
  });
}

// ========== CHAT AI ==========

function toggleChat() {
  // Skip if was a drag (not a click)
  if (window.__dragJustEnded && Date.now() - window.__dragJustEnded < 300) return;

  var panel = document.getElementById('chatPanel');
  panel.classList.toggle('visible');
  if (panel.classList.contains('visible')) {
    var input = document.getElementById('chatInput');
    if (input) { input.focus(); }
  }
}

function sendChatChip(msg) {
  var input = document.getElementById('chatInput');
  if (input) { input.value = msg; }
  sendChat();
}

async function sendChat() {
  var input = document.getElementById('chatInput');
  var msg = input.value.trim();
  if (!msg) return;

  // Add user message
  addChatMessage(msg, 'user');
  input.value = '';
  showChatTyping();

  // Try API first
  var reply = null;
  try {
    var result = await apiChat(msg);
    if (result && result.reply) {
      reply = result.reply;
    }
  } catch (e) {
    console.warn('Chat API error:', e);
  }

  // Fallback to local responses
  if (!reply) {
    reply = getLocalResponse(msg);
  }

  hideChatTyping();
  addChatMessage(reply, 'ai');
}

function addChatMessage(text, type) {
  var container = document.getElementById('chatMessages');
  var div = document.createElement('div');
  div.className = 'chat-msg ' + type;
  div.innerHTML = '<div class="chat-msg-content">' + formatChatText(text) + '</div>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showChatTyping() {
  var container = document.getElementById('chatMessages');
  var div = document.createElement('div');
  div.className = 'chat-msg ai chat-typing';
  div.id = 'chatTyping';
  div.innerHTML = '<div class="chat-msg-content">Đang trả lời...</div>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function hideChatTyping() {
  var el = document.getElementById('chatTyping');
  if (el) { el.remove(); }
}

function formatChatText(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/• /g, '• ')
    .replace(/(\d+)\. /g, '$1. ');
}

// ─── Local knowledge fallback ──────────────────────────────────

function getLocalResponse(query) {
  var q = query.toLowerCase();

  if (q.indexOf('bỏng') >= 0 || q.indexOf('bong') >= 0) {
    return '🔥 **Sơ cứu khi bị bỏng:**\n\n1. Làm mát vết bỏng dưới vòi nước sạch 15-20 phút (không dùng nước đá)\n2. Tháo bỏ quần áo, trang sức quanh vùng bỏng trước khi sưng\n3. Che vết bỏng bằng gạc sạch hoặc màng bọc thực phẩm\n4. Không bôi kem, dầu, nước mắm lên vết bỏng\n5. Không làm vỡ các nốt phồng\n\nGọi 115 nếu bỏng nặng (rộng hơn lòng bàn tay, mặt, khớp).';
  }

  if (q.indexOf('cháy') >= 0 || q.indexOf('chay') >= 0 || q.indexOf('thoát hiểm') >= 0 || q.indexOf('thoat hiem') >= 0) {
    return '🚒 **Thoát hiểm khi có cháy:**\n\n1. Bình tĩnh, không hoảng loạn\n2. Dùng khăn ướt che mũi miệng, cúi thấp người (khói độc bay lên cao)\n3. Kiểm tra cửa trước khi mở: dùng mu bàn tay sờ nắm cửa\n4. Không dùng thang máy, chỉ đi thang bộ\n5. Nếu quần áo bắt lửa: nằm xuống, lăn qua lăn lại\n6. Ra ban công/cửa sổ ra hiệu cầu cứu\n\nGọi ngay 114!';
  }

  if (q.indexOf('đột quỵ') >= 0 || q.indexOf('dot quy') >= 0 || q.indexOf('tai biến') >= 0) {
    return '🧠 **Dấu hiệu đột quỵ (FAST):**\n\n• **F (Face)**: Mặt bị lệch, méo miệng\n• **A (Arms)**: Yếu/tê một bên tay, không nâng được\n• **S (Speech)**: Nói khó, không rõ chữ\n• **T (Time)**: Gọi 115 NGAY LẬP TỨC\n\n**Khi chờ cấp cứu:**\n1. Để nạn nhân nằm nghiêng, đầu cao 30 độ\n2. Nới lỏng quần áo\n3. Không cho ăn uống (nguy cơ sặc)\n4. Ghi nhận thời gian bắt đầu triệu chứng';
  }

  if (q.indexOf('cpr') >= 0 || q.indexOf('hô hấp nhân tạo') >= 0 || q.indexOf('tim') >= 0) {
    return '❤️ **CPR – Hồi sức tim phổi:**\n\n1. Kiểm tra an toàn khu vực\n2. Gọi to, lay nhẹ kiểm tra phản ứng\n3. Gọi 115 hoặc nhờ người gọi\n4. Ép tim: 2 tay đan vào giữa ngực, ấn sâu 5-6cm, 100-120 lần/phút\n5. Sau 30 lần ép tim: hà hơi thổi ngạt 2 lần\n6. Tiếp tục 30:2 cho đến khi xe cứu thương đến\n\nNếu có AED (máy sốc tim): bật máy và làm theo hướng dẫn.';
  }

  if (q.indexOf('điện giật') >= 0 || q.indexOf('dien giat') >= 0 || q.indexOf('điện') >= 0) {
    return '⚡ **Sơ cứu điện giật:**\n\n1. NGẮT nguồn điện ngay (cầu dao, aptomat)\n2. KHÔNG chạm trực tiếp vào nạn nhân khi chưa ngắt điện\n3. Dùng vật khô không dẫn điện (gậy gỗ, chổi nhựa) gạt dây điện\n4. Kiểm tra hô hấp và tim — CPR nếu cần\n5. Gọi 115 ngay\n6. Xử lý vết bỏng điện nếu có\n\nLưu ý: nạn nhân ngã từ trên cao do điện giật cần cố định cổ.';
  }

  if (q.indexOf('giao thông') >= 0 || q.indexOf('tai nan') >= 0 || q.indexOf('giao thong') >= 0) {
    return '🚗 **Sơ cứu tai nạn giao thông:**\n\n1. Đảm bảo an toàn hiện trường (bật hazard, đặt cảnh báo)\n2. Gọi 115 và 113\n3. Không di chuyển nạn nhân trừ khi có nguy cơ cháy nổ\n4. Cầm máu vết thương hở bằng vải sạch\n5. Giữ ấm cho nạn nhân\n6. Nói chuyện trấn an — không cho ăn uống\n\nKHÔNG tháo mũ bảo hiểm nếu nghi chấn thương cổ.';
  }

  // Default
  return 'Cảm ơn bạn đã hỏi! Hiện tại trợ lý đang hoạt động ở chế độ ngoại tuyến với kiến thức hạn chế.\n\nBạn có thể hỏi về:\n• Sơ cứu bỏng\n• Thoát hiểm khi cháy\n• Sơ cứu đột quỵ\n• Hô hấp nhân tạo CPR\n• Sơ cứu điện giật\n• Sơ cứu tai nạn giao thông\n\nHoặc gọi trực tiếp:\n• 115 - Cấp cứu\n• 114 - Cứu hỏa\n• 113 - Công an';
}
