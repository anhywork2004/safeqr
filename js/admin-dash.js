// ============================================================
// SafeQR – Admin Dashboard (Locality-based, multi-contact)
// ============================================================

// ─── Event delegation for CSP compliance (no unsafe-inline) ──
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.getAttribute('data-action');
  var args = [];
  try { args = JSON.parse(el.getAttribute('data-args') || '[]'); } catch(ex) {}
  if (typeof window[action] === 'function') {
    window[action].apply(null, args);
  }
});

var SESSION_KEY = 'safeqr_session';
var CONTACTS_KEY = 'safeqr_contacts';
var PASSWORDS_KEY = 'safeqr_passwords';

var session = null;
var _localContacts = [];
var _globalContacts = [];
var _editingId = null;

// ─── Init ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  loadDashboard();
});

function checkAuth() {
  try {
    session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch(e) { session = null; }

  if (!session || !session.localityId) {
    window.location.href = 'index.html';
    return;
  }
  if (session.loginTime && (Date.now() - session.loginTime) > 8 * 60 * 60 * 1000) {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
    return;
  }
}

// ─── Load Dashboard ──────────────────────────────────────────

async function loadDashboard() {
  document.getElementById('localityLabel').textContent = session.localityName || session.localityId;
  document.getElementById('localityTitle').textContent = session.localityName || session.localityId;

  // Load contacts
  await loadContacts();
  renderContactList();
}

async function loadContacts() {
  _localContacts = [];
  _globalContacts = [];

  // Try API first
  try {
    var allContacts = await apiGetContacts();
    if (allContacts && allContacts.length > 0) {
      for (var i = 0; i < allContacts.length; i++) {
        var c = allContacts[i];
        if (c.locality_id === session.localityId) {
          _localContacts.push(c);
        } else if (c.locality_id === null || c.locality_id === undefined) {
          _globalContacts.push(c);
        }
      }
      // Merge with localStorage overrides
      mergeLocalOverrides();
      return;
    }
  } catch(e) {}

  // Fallback: use emergencyContacts global + localStorage
  var saved = getSavedContacts();
  for (var j = 0; j < emergencyContacts.length; j++) {
    var ec = emergencyContacts[j];
    var override = saved[ec.id];
    if (override) {
      ec.phone = override.phone || ec.phone;
      ec.address = override.address || ec.address;
      ec.maps_query = override.maps_query || override.mapsQuery || ec.mapsQuery;
      ec.description = override.description || ec.description;
    }
    if (ec.locality_id && ec.locality_id === session.localityId) {
      _localContacts.push(ec);
    } else if (!ec.locality_id) {
      _globalContacts.push(ec);
    }
  }
}

function mergeLocalOverrides() {
  var saved = getSavedContacts();
  for (var i = 0; i < _localContacts.length; i++) {
    var c = _localContacts[i];
    var override = saved[c.id];
    if (override) {
      c.phone = override.phone || c.phone;
      c.address = override.address || c.address;
      c.maps_query = override.maps_query || c.maps_query;
      c.description = override.description || c.description;
    }
  }
}

// ─── Render Contact List ─────────────────────────────────────

function renderContactList() {
  var list = document.getElementById('contactList');
  var html = '';

  // Global contacts section (locked)
  if (_globalContacts.length > 0) {
    html += '<div class="contact-section"><h4 class="contact-section-title">🚨 Số toàn quốc (không thể chỉnh sửa)</h4>';
    for (var i = 0; i < _globalContacts.length; i++) {
      var gc = _globalContacts[i];
      html += '<div class="contact-row contact-global">'
        + '<span class="contact-icon">' + escapeHtml(gc.icon || '📞') + '</span>'
        + '<div class="contact-info">'
        + '<strong>' + escapeHtml(gc.name) + '</strong>'
        + '<span class="contact-phone">' + escapeHtml(gc.phone) + '</span>'
        + '<span class="contact-addr">' + escapeHtml(gc.address || '') + '</span>'
        + '</div>'
        + '<span class="contact-lock" title="Số toàn quốc - không thể sửa">🔒</span>'
        + '</div>';
    }
    html += '</div>';
  }

  // Local contacts section
  html += '<div class="contact-section"><h4 class="contact-section-title">📍 Liên hệ tại ' + escapeHtml(session.localityName || 'địa phương') + '</h4>';

  if (_localContacts.length === 0) {
    html += '<div class="contact-list-empty">Chưa có liên hệ địa phương nào. Nhấn "Thêm liên hệ" để bắt đầu.</div>';
  } else {
    for (var j = 0; j < _localContacts.length; j++) {
      var lc = _localContacts[j];
      html += '<div class="contact-row contact-local">'
        + '<span class="contact-icon">' + escapeHtml(lc.icon || '📞') + '</span>'
        + '<div class="contact-info">'
        + '<strong>' + escapeHtml(lc.name) + '</strong>'
        + '<span class="contact-phone">' + escapeHtml(lc.phone) + '</span>'
        + '<span class="contact-addr">' + escapeHtml(lc.address || '') + '</span>'
        + '</div>'
        + '<div class="contact-actions">'
        + '<button class="btn-icon-edit" onclick="editContact(\'' + escapeHtmlAttr(lc.id) + '\')" title="Sửa">✏️</button>'
        + '<button class="btn-icon-del" onclick="deleteContact(\'' + escapeHtmlAttr(lc.id) + '\')" title="Xóa">🗑</button>'
        + '</div>'
        + '</div>';
    }
  }
  html += '</div>';

  list.innerHTML = html;

  // Update last updated
  var el = document.getElementById('lastUpdated');
  if (el) el.textContent = 'Cập nhật lần cuối: ' + new Date().toLocaleString('vi-VN');
}

// ─── Add/Edit Contact Modal ──────────────────────────────────

function showAddForm() {
  _editingId = null;
  document.getElementById('modalTitle').textContent = '➕ Thêm liên hệ mới';
  document.getElementById('editContactId').value = '';
  document.getElementById('cName').value = '';
  document.getElementById('cPhone').value = '';
  document.getElementById('cAddress').value = '';
  document.getElementById('cMapsQuery').value = '';
  document.getElementById('cDesc').value = '';
  document.getElementById('cIcon').value = '📞';
  document.getElementById('cColor').value = '#c62828';
  document.getElementById('contactModal').classList.add('visible');
}

function editContact(contactId) {
  var contact = null;
  for (var i = 0; i < _localContacts.length; i++) {
    if (_localContacts[i].id === contactId) { contact = _localContacts[i]; break; }
  }
  if (!contact) return;

  _editingId = contactId;
  document.getElementById('modalTitle').textContent = '✏️ Sửa: ' + contact.name;
  document.getElementById('editContactId').value = contactId;
  document.getElementById('cName').value = contact.name || '';
  document.getElementById('cPhone').value = contact.phone || '';
  document.getElementById('cAddress').value = contact.address || '';
  document.getElementById('cMapsQuery').value = contact.maps_query || contact.mapsQuery || '';
  document.getElementById('cDesc').value = contact.description || '';
  document.getElementById('cIcon').value = contact.icon || '📞';
  document.getElementById('cColor').value = contact.color || '#c62828';
  document.getElementById('contactModal').classList.add('visible');
}

function closeContactModal(e) {
  if (e && e.target !== document.getElementById('contactModal')) return;
  document.getElementById('contactModal').classList.remove('visible');
  _editingId = null;
}

// ─── Save Contact ────────────────────────────────────────────

async function saveContact() {
  var name = document.getElementById('cName').value.trim();
  var phone = document.getElementById('cPhone').value.trim();
  if (!name || !phone) { showToast('Vui lòng nhập tên và số điện thoại', true); return; }

  var data = {
    name: name,
    phone: phone,
    address: document.getElementById('cAddress').value.trim(),
    maps_query: document.getElementById('cMapsQuery').value.trim(),
    description: document.getElementById('cDesc').value.trim(),
    icon: document.getElementById('cIcon').value.trim() || '📞',
    color: document.getElementById('cColor').value || '#c62828',
  };

  if (_editingId) {
    // Update existing
    var apiResult = null;
    if (session.useApi) {
      apiResult = await apiUpdateContact(_editingId, data);
    }
    // Also save to localStorage
    var saved = getSavedContacts();
    saved[_editingId] = { phone: data.phone, address: data.address, maps_query: data.maps_query, description: data.description, _updatedAt: new Date().toISOString() };
    saveContacts(saved);
    showToast('✅ Đã cập nhật!');
  } else {
    // Create new
    if (session.useApi) {
      var createResult = await apiCreateContact(data);
      if (createResult && createResult.id) {
        showToast('✅ Đã thêm liên hệ mới!');
      } else {
        // Local fallback
        var localId = session.localityId + '-local-' + Date.now();
        var s2 = getSavedContacts();
        s2[localId] = { name: data.name, phone: data.phone, address: data.address, maps_query: data.maps_query, description: data.description, icon: data.icon, color: data.color, locality_id: session.localityId, _createdAt: new Date().toISOString() };
        saveContacts(s2);
        showToast('✅ Đã thêm (lưu cục bộ)!');
      }
    } else {
      var localId2 = session.localityId + '-local-' + Date.now();
      var s3 = getSavedContacts();
      s3[localId2] = { name: data.name, phone: data.phone, address: data.address, maps_query: data.maps_query, description: data.description, icon: data.icon, color: data.color, locality_id: session.localityId, _createdAt: new Date().toISOString() };
      saveContacts(s3);
      showToast('✅ Đã thêm (lưu cục bộ)!');
    }
  }

  closeContactModal();
  await loadContacts();
  renderContactList();
}

// ─── Delete Contact ──────────────────────────────────────────

async function deleteContact(contactId) {
  if (!confirm('Xóa liên hệ này? Hành động này không thể hoàn tác.')) return;

  if (session.useApi) {
    await apiDeleteContact(contactId);
  }
  // Also remove from localStorage
  var saved = getSavedContacts();
  delete saved[contactId];
  saveContacts(saved);

  showToast('🗑 Đã xóa');
  await loadContacts();
  renderContactList();
}

// ─── Change Password ─────────────────────────────────────────

async function changePassword() {
  var newPwd = document.getElementById('newPassword').value.trim();
  if (!newPwd) { showToast('Vui lòng nhập mật khẩu mới', true); return; }
  if (newPwd.length < 4) { showToast('Mật khẩu phải có ít nhất 4 ký tự', true); return; }

  if (session.useApi) {
    var result = await apiChangePassword(
      getLocalPasswords()[session.localityId] || '',
      newPwd
    );
    if (result && result.success) {
      showToast('✅ Đã đổi mật khẩu!');
    } else if (result && result.error) {
      showToast(result.error, true);
      return;
    }
  }

  // Save locally
  var pwds = getLocalPasswords();
  pwds[session.localityId] = newPwd;
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(pwds));
  document.getElementById('newPassword').value = '';
  showToast('✅ Đã đổi mật khẩu!');
}

// ─── Helpers ─────────────────────────────────────────────────

function getSavedContacts() {
  try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) || '{}'); } catch(e) { return {}; }
}
function saveContacts(data) {
  try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(data)); } catch(e) {}
}
function getLocalPasswords() {
  try { return JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}'); } catch(e) { return {}; }
}

function showToast(msg, isError) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  if (isError) toast.classList.add('error');
  else toast.classList.remove('error');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function() { toast.classList.remove('show', 'error'); }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escapeHtmlAttr(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── Logout ──────────────────────────────────────────────────

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  try {
    if (window.SafeQR_Security && window.SafeQR_Security.destroySession) {
      window.SafeQR_Security.destroySession();
    }
    localStorage.removeItem('safeqr_token');
  } catch(e) {}
  window.location.href = 'index.html';
}
