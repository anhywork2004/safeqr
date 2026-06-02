// ============================================================
// SafeQR – Emergency Map Dashboard
// ============================================================
// Leaflet map + delta polling for real-time emergency reports.
// Requires: Leaflet (L), security.js, api.js, admin-auth.js
// ============================================================

var POLL_INTERVAL = 7000;       // 7 seconds normal polling
var POLL_RETRY_MULT = 2;        // backoff multiplier per error
var MAX_POLL_ERRORS = 4;        // cap backoff at 2^4 = 16x interval = 112s

var _emergencyMap = null;
var _emergencyMarkers = {};     // report.id -> L.marker
var _emergencyReports = {};     // report.id -> report data
var _lastPollTime = null;       // ISO timestamp from last server response
var _pollTimer = null;
var _pollErrors = 0;
var _firstLoadDone = false;

var EMERGENCY_COLORS = {
  medical:    '#e74c3c',
  fire:       '#e67e22',
  police:     '#2c3e50',
  traffic:    '#3498db',
  electrical: '#f39c12',
  water:      '#3498db',
  other:      '#9b59b6'
};

var EMERGENCY_ICONS = {
  medical: '🚑', fire: '🚒', police: '👮',
  traffic: '🚗', electrical: '⚡', water: '💧', other: '🆘'
};

var EMERGENCY_LABELS = {
  medical: 'Y tế / Cấp cứu', fire: 'Hỏa hoạn / Cháy nổ',
  police: 'Công an / An ninh', traffic: 'Tai nạn giao thông',
  electrical: 'Sự cố điện', water: 'Sự cố nước', other: 'Sự cố khác'
};

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  // Auth check
  if (!isEmergencyMapSessionValid()) {
    window.location.href = 'index.html';
    return;
  }
  showAgencyInfo();
  initEmergencyMap();
});

function isEmergencyMapSessionValid() {
  // Check via security module
  if (window.SafeQR_Security && window.SafeQR_Security.isSessionValid) {
    if (window.SafeQR_Security.isSessionValid()) return true;
  }
  // Fallback: check sessionStorage directly
  try {
    var session = JSON.parse(sessionStorage.getItem('safeqr_session') || 'null');
    if (!session || !session.agencyId) return false;
    if (session.loginTime && (Date.now() - session.loginTime) > 8 * 60 * 60 * 1000) return false;
    return true;
  } catch(e) { return false; }
}

function showAgencyInfo() {
  try {
    var session = JSON.parse(sessionStorage.getItem('safeqr_session') || 'null');
    if (session && session.agencyName) {
      var el = document.getElementById('agencyNameDisplay');
      if (el) el.textContent = session.agencyName + ' — Bản đồ khẩn cấp';
    }
  } catch(e) {}
}

// ─── Map Initialization ──────────────────────────────────────

function initEmergencyMap() {
  // Default center: Thủ Đức, HCM
  _emergencyMap = L.map('emergencyMap', {
    center: [10.8501, 106.7719],
    zoom: 14,
    zoomControl: true
  });

  // OpenStreetMap tiles (free, no API key)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    maxZoom: 19,
    detectRetina: true
  }).addTo(_emergencyMap);

  // Initial load: fetch all active reports
  loadEmergencies(null).then(function() {
    _firstLoadDone = true;
  });

  // Start polling
  startPolling();
}

// ─── Data Loading ────────────────────────────────────────────

async function loadEmergencies(since) {
  try {
    var data = await apiGetEmergencies(since, 50);
    if (!data || !Array.isArray(data.reports)) {
      _pollErrors++;
      updateBadge(false);
      return;
    }

    _pollErrors = 0;
    updateBadge(true);

    // Save server time for next delta poll
    if (data.server_time) {
      _lastPollTime = data.server_time;
    }
    updatePollIndicator();

    // Track which IDs are in this response
    var seen = {};
    var hasNew = false;

    for (var i = 0; i < data.reports.length; i++) {
      var report = data.reports[i];
      seen[report.id] = true;

      if (!_emergencyReports[report.id]) {
        // New report
        addReport(report);
        hasNew = true;
      } else if (report.address !== _emergencyReports[report.id].address) {
        // Address updated (e.g. re-geocoded)
        updateReportAddress(report);
      }
    }

    // Remove reports that disappeared from response (expired/deleted)
    var removedIds = [];
    for (var id in _emergencyReports) {
      if (!seen[id]) {
        removedIds.push(id);
      }
    }
    for (var j = 0; j < removedIds.length; j++) {
      removeReport(removedIds[j]);
    }

    // If new reports and not first load, show toast
    if (hasNew && _firstLoadDone) {
      showAdminToast('📢 Có báo cáo khẩn cấp mới!');
    }
  } catch (e) {
    console.warn('[Emergency Map] Poll error:', e.message);
    _pollErrors++;
    updateBadge(false);
  }
}

// ─── Map Markers ─────────────────────────────────────────────

function createMarkerIcon(report) {
  var color = EMERGENCY_COLORS[report.emergency_type] || '#c62828';
  var icon = EMERGENCY_ICONS[report.emergency_type] || '🆘';

  return L.divIcon({
    className: 'emergency-marker-icon',
    html: '<div class="emergency-marker-inner" style="background:' + color + '">'
      + '<span class="emergency-marker-emoji">' + icon + '</span>'
      + '</div>'
      + '<div class="emergency-marker-pulse" style="border-color:' + color + '"></div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
}

function buildPopupContent(report) {
  var typeLabel = EMERGENCY_LABELS[report.emergency_type] || report.emergency_type;
  var icon = EMERGENCY_ICONS[report.emergency_type] || '🆘';
  var time = new Date(report.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  var date = new Date(report.created_at).toLocaleDateString('vi-VN');
  var acc = report.accuracy != null ? report.accuracy.toFixed(1) + 'm' : 'Không rõ';
  var accColor = report.accuracy != null
    ? (report.accuracy <= 10 ? '#27ae60' : (report.accuracy <= 15 ? '#f39c12' : '#e74c3c'))
    : '#888';

  return '<div class="emergency-popup">'
    + '<div class="emergency-popup-type">' + icon + ' <strong>' + escapeHtml(typeLabel) + '</strong></div>'
    + '<div class="emergency-popup-address">' + escapeHtml(report.address || 'Không rõ địa chỉ') + '</div>'
    + '<div class="emergency-popup-time">🕐 ' + time + ' · ' + date + '</div>'
    + '<div class="emergency-popup-accuracy" style="color:' + accColor + '">🎯 Độ chính xác GPS: ' + acc + '</div>'
    + '</div>';
}

function addReport(report) {
  _emergencyReports[report.id] = report;

  var marker = L.marker([report.latitude, report.longitude], {
    icon: createMarkerIcon(report)
  }).addTo(_emergencyMap);

  marker.bindPopup(buildPopupContent(report));
  _emergencyMarkers[report.id] = marker;

  // Add sidebar card
  addSidebarCard(report);

  // Auto-fit to show all markers
  fitAllMarkers();
}

function updateReportAddress(report) {
  _emergencyReports[report.id].address = report.address;
  _emergencyReports[report.id].accuracy = report.accuracy;

  // Update popup content
  var marker = _emergencyMarkers[report.id];
  if (marker) {
    marker.setPopupContent(buildPopupContent(report));
  }

  // Update sidebar card
  var card = document.querySelector('.report-card[data-id="' + report.id + '"]');
  if (card) {
    var addrEl = card.querySelector('.report-card-address');
    if (addrEl) addrEl.textContent = report.address || 'Không rõ địa chỉ';
    var accEl = card.querySelector('.report-card-accuracy');
    if (accEl) {
      var acc = report.accuracy;
      accEl.textContent = '🎯 ' + (acc != null ? acc.toFixed(0) + 'm' : '--');
      accEl.className = 'report-card-accuracy ' + getAccuracyClass(acc);
    }
  }
}

function removeReport(id) {
  if (_emergencyMarkers[id]) {
    _emergencyMap.removeLayer(_emergencyMarkers[id]);
    delete _emergencyMarkers[id];
  }
  delete _emergencyReports[id];

  // Animate sidebar card removal
  var card = document.querySelector('.report-card[data-id="' + id + '"]');
  if (card) {
    card.style.opacity = '0';
    card.style.transform = 'translateX(30px)';
    card.style.transition = 'all 0.3s ease';
    setTimeout(function() {
      if (card.parentNode) card.parentNode.removeChild(card);
    }, 300);
  }
}

function fitAllMarkers() {
  var ids = Object.keys(_emergencyMarkers);
  if (ids.length === 0) return;
  if (ids.length === 1) {
    _emergencyMap.setView(_emergencyMarkers[ids[0]].getLatLng(), 16);
    return;
  }
  var group = [];
  for (var i = 0; i < ids.length; i++) {
    group.push(_emergencyMarkers[ids[i]].getLatLng());
  }
  _emergencyMap.fitBounds(L.latLngBounds(group), { padding: [50, 50], maxZoom: 15 });
}

// ─── Sidebar Cards ───────────────────────────────────────────

function getAccuracyClass(accuracy) {
  if (accuracy == null) return '';
  if (accuracy <= 10) return 'good';
  if (accuracy <= 15) return 'warn';
  return 'bad';
}

function addSidebarCard(report) {
  var list = document.getElementById('emergencyReportList');
  var color = EMERGENCY_COLORS[report.emergency_type] || '#c62828';
  var icon = EMERGENCY_ICONS[report.emergency_type] || '🆘';
  var typeLabel = EMERGENCY_LABELS[report.emergency_type] || report.emergency_type;
  var time = new Date(report.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  var acc = report.accuracy;
  var accClass = getAccuracyClass(acc);
  var mapsUrl = 'https://www.google.com/maps?q=' + report.latitude + ',' + report.longitude;

  var card = document.createElement('div');
  card.className = 'report-card';
  card.setAttribute('data-id', report.id);
  card.style.setProperty('--report-color', color);

  card.innerHTML =
    '<div class="report-card-header">'
    + '<span class="report-card-icon">' + icon + '</span>'
    + '<span class="report-card-type">' + escapeHtml(typeLabel) + '</span>'
    + '<span class="report-card-time">' + time + '</span>'
    + '</div>'
    + '<div class="report-card-address">' + escapeHtml(report.address || 'Không rõ địa chỉ') + '</div>'
    + '<div class="report-card-meta">'
    + '<span class="report-card-accuracy ' + accClass + '">🎯 ' + (acc != null ? acc.toFixed(0) + 'm' : '--') + '</span>'
    + '</div>'
    + '<div class="report-card-actions">'
    + '<a href="' + mapsUrl + '" target="_blank" rel="noopener" class="btn-maps-mini">🗺 Google Maps</a>'
    + '</div>';

  // Insert at top — newest first
  if (list.firstChild) {
    list.insertBefore(card, list.firstChild);
  } else {
    list.appendChild(card);
  }
}

// ─── Polling ─────────────────────────────────────────────────

function startPolling() {
  stopPolling();
  scheduleNextPoll();
}

function scheduleNextPoll() {
  if (_pollTimer) clearTimeout(_pollTimer);
  var backoffMultiplier = Math.pow(POLL_RETRY_MULT, Math.min(_pollErrors, MAX_POLL_ERRORS));
  var interval = POLL_INTERVAL * backoffMultiplier;
  _pollTimer = setTimeout(function() {
    loadEmergencies(_lastPollTime);
    scheduleNextPoll();
  }, interval);
}

function stopPolling() {
  if (_pollTimer) {
    clearTimeout(_pollTimer);
    _pollTimer = null;
  }
}

function updatePollIndicator() {
  var el = document.getElementById('lastPollTime');
  if (el && _lastPollTime) {
    var time = new Date(_lastPollTime).toLocaleTimeString('vi-VN');
    el.textContent = 'Cập nhật lúc ' + time;
  }
}

function updateBadge(online) {
  var badge = document.getElementById('headerBadge');
  if (badge) {
    badge.innerHTML = online ? '🟢 Trực tuyến' : '🔴 Mất kết nối';
  }
}

// ─── Toast ───────────────────────────────────────────────────

function showAdminToast(msg) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// ─── Escape HTML ─────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── Logout ──────────────────────────────────────────────────

function handleLogout() {
  try {
    sessionStorage.removeItem('safeqr_session');
    if (window.SafeQR_Security && window.SafeQR_Security.destroySession) {
      window.SafeQR_Security.destroySession();
    }
  } catch(e) {}
  window.location.href = 'index.html';
}

// Cleanup on page unload
window.addEventListener('beforeunload', stopPolling);
