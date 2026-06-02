function getMergedContacts() {
  try {
    var saved = JSON.parse(localStorage.getItem('safeqr_contacts') || '{}');
  } catch (e) {
    var saved = {};
  }
  return emergencyContacts.map(function (c) {
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

function initApp() {
  document.getElementById('locality').textContent = SITE_CONFIG.locality;
  renderCards();
  renderExtraNumbers();
  registerSW();
  setupSOS();
  setupKeyboard();
}

function setupKeyboard() {
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closePhoneModal();
    }
  });
}

document.addEventListener('DOMContentLoaded', initApp);

function renderCards() {
  var contacts = getMergedContacts();
  var grid = document.getElementById('cardGrid');
  grid.innerHTML = contacts.map(function (c) {
    return '<div class="card" style="--card-color: ' + c.color + '">' +
      '<div class="card-icon">' + c.icon + '</div>' +
      '<div class="card-name">' + c.name + '</div>' +
      '<div class="card-desc">' + c.description + '</div>' +
      '<div class="card-phone">' + escapeHtml(c.phone) + '</div>' +
      '<div class="card-address">' + escapeHtml(c.address) + '</div>' +
      '<div class="card-actions">' +
        '<button class="btn btn-call" onclick="handleCall(\'' + escapeHtml(c.phone) + '\',\'' + escapeHtml(c.name) + '\',\'' + c.color + '\')">📞 Gọi ngay</button>' +
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

function openMaps(query) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const encoded = encodeURIComponent(query);

  if (isMobile) {
    const geoUri = 'geo:0,0?q=' + encoded;
    const started = Date.now();
    window.location.href = geoUri;
    setTimeout(() => {
      if (Date.now() - started < 2000) {
        window.open('https://www.google.com/maps/search/?api=1&query=' + encoded, '_blank');
      }
    }, 800);
  } else {
    window.open('https://www.google.com/maps/search/?api=1&query=' + encoded, '_blank');
  }
}

function shareLocation() {
  if (!navigator.geolocation) {
    showToast('Thiết bị không hỗ trợ định vị');
    return;
  }

  showToast('Đang lấy vị trí...');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const link = 'https://www.google.com/maps?q=' + latitude + ',' + longitude;
      const text = 'Vị trí của tôi: ' + link;

      if (navigator.share) {
        navigator.share({ title: 'Vị trí khẩn cấp', text: text, url: link })
          .catch(() => fallbackShare(link));
      } else {
        fallbackShare(link);
      }
    },
    (err) => {
      showToast('Không lấy được vị trí. Vui lòng bật GPS.');
      console.error('Geolocation error:', err);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function fallbackShare(link) {
  const input = document.createElement('textarea');
  input.value = 'Vị trí của tôi: ' + link;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  showToast('Đã sao chép link vị trí! Gửi cho người hỗ trợ.');
  window.open(link, '_blank');
}

function toggleSOS() {
  const actions = document.getElementById('sosActions');
  const btn = document.getElementById('sosBtn');

  if (actions.classList.contains('visible')) {
    actions.classList.remove('visible');
    btn.style.animationPlayState = 'running';
  } else {
    actions.classList.add('visible');
    btn.style.animationPlayState = 'paused';
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function setupSOS() {
  const sosBtn = document.getElementById('sosBtn');
  if (sosBtn) {
    sosBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSOS();
    });
  }

  // Close SOS menu on outside click
  document.addEventListener('click', (e) => {
    const sosContainer = document.getElementById('sosContainer');
    const actions = document.getElementById('sosActions');
    if (sosContainer && !sosContainer.contains(e.target) && actions.classList.contains('visible')) {
      actions.classList.remove('visible');
      document.getElementById('sosBtn').style.animationPlayState = 'running';
    }
  });
}
