var SESSION_KEY = 'safeqr_session';
var CONTACTS_KEY = 'safeqr_contacts';
var PASSWORDS_KEY = 'safeqr_passwords';

var session = null;
var currentContact = null;
var currentDefault = null;

// ========== AUTH CHECK ==========
function checkAuth() {
  try {
    var raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) { redirectLogin(); return; }
    session = JSON.parse(raw);
    if (!session.agencyId) { redirectLogin(); return; }

    // Check session age (max 8 hours)
    var elapsed = Date.now() - new Date(session.loginTime).getTime();
    if (elapsed > 8 * 60 * 60 * 1000) {
      sessionStorage.removeItem(SESSION_KEY);
      redirectLogin();
      return;
    }

    document.getElementById('agencyLabel').textContent = session.agencyName;
  } catch (e) {
    redirectLogin();
  }
}

function redirectLogin() {
  window.location.href = 'index.html';
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'index.html';
}

// ========== DATA ==========
function getSavedContacts() {
  try {
    var raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveContacts(contacts) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

function getPasswords() {
  try {
    var raw = localStorage.getItem(PASSWORDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function savePassword(agencyId, newPass) {
  var pwd = getPasswords();
  pwd[agencyId] = newPass;
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(pwd));
}

// ========== LOAD & RENDER ==========
function loadDashboard() {
  currentDefault = findContact(session.agencyId);
  if (!currentDefault) {
    showToast('Không tìm thấy dữ liệu đơn vị', true);
    return;
  }

  var saved = getSavedContacts();
  currentContact = saved[session.agencyId]
    ? Object.assign({}, currentDefault, saved[session.agencyId])
    : Object.assign({}, currentDefault);

  document.getElementById('phone').value = currentContact.phone || '';
  document.getElementById('address').value = currentContact.address || '';
  document.getElementById('mapsQuery').value = currentContact.mapsQuery || '';
  document.getElementById('description').value = currentContact.description || '';

  // Show last updated
  if (saved[session.agencyId] && saved[session.agencyId]._updatedAt) {
    document.getElementById('lastUpdated').textContent =
      'Cập nhật lần cuối: ' + new Date(saved[session.agencyId]._updatedAt).toLocaleString('vi-VN');
  } else {
    document.getElementById('lastUpdated').textContent = '';
  }

  renderPreview();
}

function renderPreview() {
  var card = document.getElementById('previewCard');
  var phone = document.getElementById('phone').value || currentContact.phone;
  var address = document.getElementById('address').value || currentContact.address;
  var desc = document.getElementById('description').value || currentContact.description;

  card.style.setProperty('--card-color', currentDefault.color);
  card.innerHTML =
    '<div class="pc-icon">' + currentDefault.icon + '</div>' +
    '<div class="pc-name">' + currentDefault.name + '</div>' +
    '<div class="pc-phone">' + escapeHtml(phone) + '</div>' +
    '<div class="pc-address">' + escapeHtml(address) + '</div>' +
    '<div class="pc-desc">' + escapeHtml(desc) + '</div>';
}

// Live preview binding
document.addEventListener('DOMContentLoaded', async function () {
  await loadData();
  checkAuth();
  loadDashboard();

  var inputs = document.querySelectorAll('#editForm input, #editForm textarea');
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].addEventListener('input', renderPreview);
  }

  var form = document.getElementById('editForm');
  if (form) {
    form.addEventListener('submit', handleSave);
  }
});

// ========== SAVE ==========
async function handleSave(e) {
  e.preventDefault();

  var phone = document.getElementById('phone').value.trim();
  var address = document.getElementById('address').value.trim();
  var mapsQuery = document.getElementById('mapsQuery').value.trim();
  var description = document.getElementById('description').value.trim();
  var newPassword = document.getElementById('newPassword').value.trim();

  if (!phone) {
    showToast('Vui lòng nhập số điện thoại', true);
    return;
  }

  var saved = getSavedContacts();
  saved[session.agencyId] = {
    phone: phone,
    address: address,
    mapsQuery: mapsQuery,
    description: description,
    _updatedAt: new Date().toISOString()
  };
  saveContacts(saved);

  // Try API save if available
  if (session.useApi) {
    var apiResult = await apiUpdateContact(session.agencyId, {
      phone: phone,
      address: address,
      maps_query: mapsQuery,
      description: description
    });
    if (apiResult) {
      console.log('API save successful');
    } else {
      console.warn('API save failed, saved locally only');
    }
  }

  if (newPassword) {
    if (newPassword.length < 4) {
      showToast('Mật khẩu phải có ít nhất 4 ký tự', true);
      return;
    }
    // Try API password change if available
    if (session.useApi) {
      var pwdResult = await apiChangePassword(
        getPasswords()[session.agencyId] || DEFAULT_PASSWORDS[session.agencyId],
        newPassword
      );
      if (pwdResult && pwdResult.success) {
        console.log('API password change successful');
      }
    }
    savePassword(session.agencyId, newPassword);
    document.getElementById('newPassword').value = '';
    showToast('Đã lưu thông tin và đổi mật khẩu thành công!');
  } else {
    showToast('Đã lưu thông tin thành công!');
  }

  // Update last updated
  document.getElementById('lastUpdated').textContent =
    'Cập nhật lần cuối: ' + new Date().toLocaleString('vi-VN');
}

// ========== RESET ==========
function resetToDefault() {
  if (!confirm('Khôi phục về thông tin mặc định? Dữ liệu đã sửa sẽ bị xóa.')) return;

  var saved = getSavedContacts();
  delete saved[session.agencyId];
  saveContacts(saved);

  document.getElementById('phone').value = currentDefault.phone || '';
  document.getElementById('address').value = currentDefault.address || '';
  document.getElementById('mapsQuery').value = currentDefault.mapsQuery || '';
  document.getElementById('description').value = currentDefault.description || '';
  renderPreview();
  document.getElementById('lastUpdated').textContent = '';
  showToast('Đã khôi phục về thông tin mặc định');
}

// ========== UTILS ==========
function findContact(agencyId) {
  for (var i = 0; i < emergencyContacts.length; i++) {
    if (emergencyContacts[i].id === agencyId) return emergencyContacts[i];
  }
  return null;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg, isError) {
  var toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function () { toast.classList.remove('show'); }, 3000);
}
