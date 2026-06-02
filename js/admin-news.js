// ============================================================
// SafeQR – Admin News Management
// ============================================================

var SESSION_KEY = 'safeqr_session';

// ── Auth Check ───────────────────────────────────────────────

function checkAuth() {
  try {
    var raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) { redirectLogin(); return; }
    var session = JSON.parse(raw);
    if (!session.agencyId) { redirectLogin(); return; }
    var elapsed = Date.now() - new Date(session.loginTime).getTime();
    if (elapsed > 8 * 60 * 60 * 1000) {
      sessionStorage.removeItem(SESSION_KEY);
      redirectLogin();
      return;
    }
    document.getElementById('agencyLabel').textContent = session.agencyName;
    return session;
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

// ── Load Posts ───────────────────────────────────────────────

var _session = null;
var _editingId = null;
var CAT_LABELS = {
  'safety': '🛡️ An toàn',
  'health': '🏥 Y tế',
  'traffic': '🚗 Giao thông',
  'weather': '🌦 Thời tiết',
  'general': '📌 Chung',
  'other': '📋 Khác'
};

async function loadMyPosts() {
  var list = document.getElementById('newsList');
  try {
    var resp = await fetch('/api/news?agency=' + _session.agencyId + '&limit=50');
    if (!resp.ok) throw new Error('API error');
    var data = await resp.json();
    var posts = data.posts || [];

    if (posts.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:20px;">Chưa có bài đăng nào. Hãy đăng bài đầu tiên!</p>';
      return;
    }

    list.innerHTML = posts.map(function (p) {
      var dateStr = p.created_at
        ? new Date(p.created_at + 'Z').toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      return '<div class="news-item">' +
        '<div class="news-item-info">' +
          (p.is_pinned ? '<span class="pinned-marker">📌 </span>' : '') +
          '<span class="news-item-title">' + escapeHtml(p.title) + '</span>' +
          '<div class="news-item-meta">' +
            (CAT_LABELS[p.category] || 'Chung') + ' · ' + dateStr +
            ' · <span class="' + (p.is_published ? 'status-published' : 'status-draft') + '">' +
            (p.is_published ? 'Đã đăng' : 'Bản nháp') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="news-item-actions">' +
          '<button class="btn-sm primary" onclick="startEdit(' + p.id + ')">✏️ Sửa</button>' +
          '<button class="btn-sm danger" onclick="deletePost(' + p.id + ')">🗑 Xóa</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) {
    list.innerHTML = '<p style="color:#c62828;font-size:0.82rem;">⚠️ Lỗi tải danh sách</p>';
    console.warn('Load posts error:', e);
  }
}

// ── Create / Update Post ─────────────────────────────────────

async function handleSubmit(e) {
  e.preventDefault();

  var title = document.getElementById('newsTitle').value.trim();
  var content = document.getElementById('newsContent').value.trim();
  if (!title || !content) {
    showToast('Vui lòng nhập tiêu đề và nội dung', true);
    return;
  }

  var body = {
    title: title,
    summary: document.getElementById('newsSummary').value.trim(),
    content: content,
    image_url: document.getElementById('newsImageUrl').value.trim(),
    category: document.getElementById('newsCategory').value,
    is_pinned: document.getElementById('newsIsPinned').checked,
    is_published: document.getElementById('newsIsPublished').checked
  };

  var btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Đang lưu...';

  var token = apiGetToken();
  var method = _editingId ? 'PUT' : 'POST';
  var url = _editingId ? '/api/news/' + _editingId : '/api/news';

  try {
    var resp = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      var errData = await resp.json().catch(function() { return {}; });
      throw new Error(errData.error || 'Lỗi máy chủ');
    }

    showToast(_editingId ? '✅ Đã cập nhật bài viết!' : '✅ Đã đăng bài thành công!');
    cancelEdit();
    loadMyPosts();
  } catch (e) {
    showToast('⚠️ ' + e.message, true);
    console.warn('Save post error:', e);
  }

  btn.disabled = false;
  btn.textContent = '📋 Đăng bài';
}

// ── Edit ─────────────────────────────────────────────────────

async function startEdit(id) {
  try {
    var resp = await fetch('/api/news/' + id);
    if (!resp.ok) throw new Error('Not found');
    var post = await resp.json();

    _editingId = post.id;
    document.getElementById('formTitle').textContent = '✏️ Sửa bài viết #' + post.id;
    document.getElementById('editId').value = post.id;
    document.getElementById('newsTitle').value = post.title;
    document.getElementById('newsCategory').value = post.category;
    document.getElementById('newsSummary').value = post.summary || '';
    document.getElementById('newsContent').value = post.content;
    document.getElementById('newsImageUrl').value = post.image_url || '';
    document.getElementById('newsIsPinned').checked = !!post.is_pinned;
    document.getElementById('newsIsPublished').checked = !!post.is_published;

    document.getElementById('submitBtn').textContent = '💾 Lưu thay đổi';
    document.getElementById('cancelEditBtn').style.display = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('newsTitle').focus();
  } catch (e) {
    showToast('⚠️ Không tìm thấy bài viết', true);
  }
}

function cancelEdit() {
  _editingId = null;
  document.getElementById('formTitle').textContent = '📝 Đăng bài mới';
  document.getElementById('editId').value = '';
  document.getElementById('newsTitle').value = '';
  document.getElementById('newsCategory').value = 'general';
  document.getElementById('newsSummary').value = '';
  document.getElementById('newsContent').value = '';
  document.getElementById('newsImageUrl').value = '';
  document.getElementById('newsIsPinned').checked = false;
  document.getElementById('newsIsPublished').checked = true;
  document.getElementById('submitBtn').textContent = '📋 Đăng bài';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

// ── Delete ──────────────────────────────────────────────────

async function deletePost(id) {
  if (!confirm('Xóa bài viết này? Hành động này không thể hoàn tác.')) return;

  var token = apiGetToken();
  try {
    var resp = await fetch('/api/news/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!resp.ok) {
      var errData = await resp.json().catch(function() { return {}; });
      throw new Error(errData.error || 'Lỗi xóa');
    }
    showToast('🗑 Đã xóa bài viết');
    loadMyPosts();
  } catch (e) {
    showToast('⚠️ ' + e.message, true);
  }
}

// ── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
  await loadData();
  _session = checkAuth();
  if (!_session) return;

  loadMyPosts();

  var form = document.getElementById('newsForm');
  if (form) form.addEventListener('submit', handleSubmit);
});

// ── Helpers ──────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg, isError) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function () { toast.classList.remove('show'); }, 3000);
}
