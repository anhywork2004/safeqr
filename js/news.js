// ============================================================
// SafeQR – News Feed (Bảng Tin)
// ============================================================

var _currentCategory = '';
var _currentOffset = 0;
var _currentLimit = 10;
var _hasMore = true;
var _loading = false;

// ── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  loadPosts();
  setupFilters();
  setupLoadMore();
  setupDetailModal();
});

// ── Fetch Posts ──────────────────────────────────────────────

async function loadPosts(reset) {
  if (_loading) return;
  _loading = true;

  if (reset) {
    _currentOffset = 0;
    _hasMore = true;
    document.getElementById('newsFeed').innerHTML = '';
  }

  var feed = document.getElementById('newsFeed');
  if (reset) {
    feed.innerHTML = '<div class="news-loading">Đang tải bảng tin...</div>';
  }

  var params = '?limit=' + _currentLimit + '&offset=' + _currentOffset;
  if (_currentCategory) params += '&category=' + encodeURIComponent(_currentCategory);

  try {
    var resp = await fetch('/api/news' + params);
    if (!resp.ok) throw new Error('Network error');
    var data = await resp.json();
    var posts = data.posts || [];

    if (reset) feed.innerHTML = '';

    if (posts.length === 0 && reset) {
      document.getElementById('newsEmpty').style.display = 'block';
      document.getElementById('newsLoadMore').style.display = 'none';
      _hasMore = false;
    } else {
      document.getElementById('newsEmpty').style.display = 'none';
    }

    for (var i = 0; i < posts.length; i++) {
      feed.appendChild(buildPostCard(posts[i]));
    }

    _currentOffset += posts.length;
    _hasMore = posts.length >= _currentLimit;
    document.getElementById('newsLoadMore').style.display = _hasMore ? 'block' : 'none';
  } catch (e) {
    if (reset) {
      feed.innerHTML = '<div class="news-loading">⚠️ Không thể tải bảng tin. Vui lòng thử lại.</div>';
    }
    console.warn('News load error:', e);
  }

  _loading = false;
}

// ── Build Card ───────────────────────────────────────────────

function buildPostCard(post) {
  var card = document.createElement('div');
  card.className = 'news-card' + (post.is_pinned ? ' pinned' : '');

  var dateStr = post.created_at
    ? new Date(post.created_at + 'Z').toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  var catLabels = {
    'safety': '🛡️ An toàn',
    'health': '🏥 Y tế',
    'traffic': '🚗 Giao thông',
    'weather': '🌦 Thời tiết',
    'general': '📌 Chung',
    'other': '📋 Khác'
  };

  card.innerHTML =
    '<div class="news-card-header">' +
      '<span class="news-agency-icon">' + (post.agency_icon || '📋') + '</span>' +
      '<span class="news-agency-name">' + escapeHtml(post.agency_name || 'SafeQR') + '</span>' +
      (post.is_pinned ? '<span class="news-pin-badge">📌 Ghim</span>' : '') +
      '<span class="news-category-badge">' + (catLabels[post.category] || catLabels['general']) + '</span>' +
    '</div>' +
    '<div class="news-card-title"><a href="javascript:void(0)" data-id="' + post.id + '">' + escapeHtml(post.title) + '</a></div>' +
    '<div class="news-card-summary">' + escapeHtml(post.summary || post.content) + '</div>' +
    '<div class="news-card-meta">' +
      '<span class="news-card-time">🕐 ' + dateStr + '</span>' +
    '</div>';

  // Click to open detail
  card.querySelector('.news-card-title a').addEventListener('click', function (e) {
    e.preventDefault();
    openPostDetail(post);
  });

  return card;
}

// ── Post Detail Modal ────────────────────────────────────────

function setupDetailModal() {
  var overlay = document.getElementById('newsDetailOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'newsDetailOverlay';
    overlay.className = 'news-detail-overlay';
    overlay.innerHTML =
      '<div class="news-detail" id="newsDetail">' +
        '<button class="news-detail-close" onclick="closeNewsDetail()">✕</button>' +
        '<div class="news-detail-agency"><span class="icon" id="detailIcon"></span><span class="name" id="detailAgency"></span></div>' +
        '<h2 id="detailTitle"></h2>' +
        '<div class="news-detail-content" id="detailContent"></div>' +
        '<div class="news-detail-time" id="detailTime"></div>' +
      '</div>';
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeNewsDetail();
    });
    document.body.appendChild(overlay);
  }
}

function openPostDetail(post) {
  var overlay = document.getElementById('newsDetailOverlay');
  document.getElementById('detailIcon').textContent = post.agency_icon || '📋';
  document.getElementById('detailAgency').textContent = post.agency_name || 'SafeQR';
  document.getElementById('detailTitle').textContent = post.title;
  document.getElementById('detailContent').textContent = post.content;
  document.getElementById('detailTime').textContent = post.created_at
    ? 'Đăng lúc ' + new Date(post.created_at + 'Z').toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeNewsDetail() {
  document.getElementById('newsDetailOverlay').classList.remove('visible');
  document.body.style.overflow = '';
}

// ── Filters ──────────────────────────────────────────────────

function setupFilters() {
  var chips = document.querySelectorAll('.filter-chip');
  for (var i = 0; i < chips.length; i++) {
    chips[i].addEventListener('click', function () {
      var cat = this.getAttribute('data-category');
      if (cat === _currentCategory) return;

      // Update active state
      chips.forEach(function (c) { c.classList.remove('active'); });
      this.classList.add('active');

      _currentCategory = cat;
      loadPosts(true);
    });
  }
}

// ── Load More ────────────────────────────────────────────────

function setupLoadMore() {
  var btn = document.getElementById('loadMoreBtn');
  if (btn) {
    btn.addEventListener('click', function () { loadPosts(false); });
  }
}

// ── Helpers ──────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
