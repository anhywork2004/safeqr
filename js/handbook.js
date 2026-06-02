// ============================================================
//  SafeQR – Book Handbook  |  handbook.js  (v2 – clean rewrite)
// ============================================================

// ── 1. Ambient Particles ─────────────────────────────────
(function () {
  var canvas = document.getElementById('particles');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ctx = canvas.getContext('2d');
  var W, H;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  var pts = Array.from({ length: 36 }, function () {
    return {
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      a: Math.random() * 0.22 + 0.04,
      c: Math.random() < 0.4 ? '229,57,53' : '175,135,75'
    };
  });
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -4) p.x = W + 4; if (p.x > W + 4) p.x = -4;
      if (p.y < -4) p.y = H + 4; if (p.y > H + 4) p.y = -4;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')'; ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

// ── 2. State ──────────────────────────────────────────────
var currentSpread = 0;
var totalSpreads  = 6;
var bookOpened    = false;
var isAnimating   = false;

// ── 3. Cover Inside ───────────────────────────────────────
var COVER_INSIDE = { coverInside: true };

// ── 4. Content Data ───────────────────────────────────────
var topics = [
  // 01
  { num:'01', icon:'🔥', accent:'#e74c3c', title:'Sơ cứu khi bị bỏng',
    items: [
      'Làm mát vết bỏng dưới <strong>vòi nước sạch 15-20 phút</strong> – không dùng nước đá',
      'Tháo bỏ quần áo, trang sức quanh vùng bỏng <strong>trước khi sưng tấy</strong>',
      'Che vết bỏng bằng <strong>gạc sạch</strong> hoặc màng bọc thực phẩm',
      '<strong>Không</strong> bôi kem đánh răng, dầu, mỡ trăn, nước mắm lên vết bỏng',
      '<strong>Không</strong> làm vỡ các nốt phồng rộp – dễ gây nhiễm trùng',
      'Bỏng rộng hơn lòng bàn tay hoặc ở mặt, khớp, bộ phận sinh dục: đến viện ngay'
    ], call:'Gọi 115 nếu bỏng nặng, diện rộng' },
  // 02
  { num:'02', icon:'🚒', accent:'#e67e22', title:'Thoát hiểm khi có cháy',
    items: [
      'Giữ <strong>bình tĩnh</strong>, không hoảng loạn – hoảng loạn là kẻ thù số một',
      'Dùng <strong>khăn ướt che mũi miệng</strong>, cúi thấp người khi di chuyển',
      'Trước khi mở cửa: <strong>dùng mu bàn tay sờ nắm cửa</strong> – nóng thì đừng mở',
      '<strong>Tuyệt đối không dùng thang máy</strong> – chỉ đi cầu thang bộ',
      'Quần áo bắt lửa → <strong>nằm xuống, lăn qua lăn lại</strong> để dập lửa',
      'Ra ban công/cửa sổ, dùng khăn sáng màu <strong>ra hiệu cầu cứu</strong>'
    ], call:'Gọi ngay 114 khi phát hiện cháy' },
  // 03
  { num:'03', icon:'🧠', accent:'#e74c3c', title:'Dấu hiệu & Sơ cứu Đột quỵ',
    fast: [
      '<strong>F</strong>ace – Khuôn mặt bị lệch, méo miệng một bên, cười không đều',
      '<strong>A</strong>rms – Yếu hoặc tê liệt một bên tay, không nâng nổi cả hai tay',
      '<strong>S</strong>peech – Nói khó, nói ngọng, không rõ chữ hoặc không nói được',
      '<strong>T</strong>ime – Gọi <strong>115 NGAY LẬP TỨC</strong> – mỗi phút là hàng triệu tế bào não chết'
    ],
    tips: 'Chờ cấp cứu: để nạn nhân <strong>nằm nghiêng, đầu cao 30°</strong>, nới lỏng quần áo. <strong>Tuyệt đối không cho ăn uống</strong>. Ghi nhớ chính xác <strong>thời gian khởi phát</strong> triệu chứng.',
    call:'Gọi 115 – Thời gian là não!' },
  // 04
  { num:'04', icon:'❤️', accent:'#c62828', title:'CPR – Hồi sức tim phổi',
    items: [
      'Kiểm tra <strong>an toàn khu vực</strong> trước khi tiếp cận nạn nhân',
      'Lay nhẹ vai, gọi to – không đáp ứng: <strong>gọi 115 ngay</strong>',
      'Đặt <strong>2 tay đan chéo</strong> vào giữa ngực, ấn sâu <strong>5-6 cm</strong>',
      'Tốc độ: <strong>100-120 lần/phút</strong> – đếm theo nhịp bài "Stayin\' Alive"',
      'Tỷ lệ: <strong>30 lần ép tim : 2 lần thổi ngạt</strong>',
      'Tiếp tục đến khi xe cấp cứu đến <strong>hoặc</strong> nạn nhân tỉnh lại'
    ], call:'Duy trì CPR liên tục đến khi có trợ giúp' },
  // 05
  { num:'05', icon:'⚡', accent:'#f39c12', title:'Sơ cứu khi bị điện giật',
    items: [
      '<strong>Ngắt nguồn điện ngay</strong> – tắt cầu dao, aptomat, rút phích cắm',
      '<strong>Tuyệt đối không chạm</strong> trực tiếp vào nạn nhân khi chưa ngắt điện',
      'Dùng <strong>vật khô không dẫn điện</strong> (gậy gỗ, chổi nhựa) gạt dây điện',
      'Kiểm tra hô hấp & mạch – nếu ngừng tim: <strong>CPR ngay lập tức</strong>',
      'Xử lý vết bỏng điện: làm mát, che phủ bằng gạc sạch',
      'Nạn nhân ngã từ cao do điện giật: <strong>cố định cổ, không di chuyển</strong>'
    ], call:'Gọi 115 ngay sau khi ngắt điện an toàn' },
  // 06
  { num:'06', icon:'🚗', accent:'#2c3e50', title:'Sơ cứu tai nạn giao thông',
    items: [
      '<strong>Đảm bảo an toàn hiện trường:</strong> bật hazard, đặt biển cảnh báo tam giác',
      'Gọi <strong>115</strong> (cấp cứu) và <strong>113</strong> (công an) cùng lúc',
      '<strong>Không di chuyển nạn nhân</strong> trừ khi có nguy cơ cháy nổ ngay lập tức',
      'Cầm máu: dùng vải sạch, <strong>băng ép chặt</strong> lên vết thương',
      'Giữ ấm cơ thể, liên tục trấn an nạn nhân',
      '<strong>Không tháo mũ bảo hiểm</strong> nếu nghi ngờ chấn thương cột sống cổ'
    ], call:'Gọi đồng thời 115 và 113' },
  // 07
  { num:'07', icon:'🌊', accent:'#2980b9', title:'Sơ cứu đuối nước',
    items: [
      'Đưa nạn nhân lên bờ <strong>an toàn</strong> – ưu tiên an toàn của người cứu',
      'Khai thông đường thở: nghiêng đầu, lấy sạch dị vật trong miệng',
      '<strong>CPR ngay lập tức</strong> nếu không thở – đừng mất thời gian dốc nước',
      'Ép tim + thổi ngạt theo tỷ lệ <strong>30:2</strong>',
      'Giữ ấm cơ thể sau khi tỉnh – quấn chăn, áo ấm',
      '<strong>Luôn gọi 115</strong> kể cả khi đã tỉnh (nguy cơ phù phổi thứ phát)'
    ], call:'Không dốc ngược nạn nhân – CPR trước!' },
  // 08
  { num:'08', icon:'🤢', accent:'#27ae60', title:'Ngộ độc thực phẩm',
    items: [
      'Ngừng ngay việc ăn/uống món nghi ngờ gây ngộ độc',
      '<strong>Không tự gây nôn</strong> nếu nạn nhân lơ mơ, co giật hoặc khó thở',
      'Uống nhiều nước, tốt nhất là <strong>dung dịch ORS (oresol)</strong>',
      'Giữ lại mẫu thức ăn, chất nôn để xét nghiệm tìm nguyên nhân',
      'Đến viện nếu: nôn nhiều, tiêu chảy nặng, sốt cao, có máu trong phân',
      'Trẻ em, người già, phụ nữ có thai: <strong>đến viện sớm hơn</strong>'
    ], call:'Gọi 115 nếu co giật, khó thở, lơ mơ' },
  // 09
  { num:'09', icon:'📋', accent:'#9b59b6', title:'Số điện thoại khẩn cấp',
    numbers: [
      { label:'Cấp cứu y tế',         num:'115',      color:'#c62828' },
      { label:'Cứu hỏa – PCCC',       num:'114',      color:'#e67e22' },
      { label:'Công an',              num:'113',      color:'#2c3e50' },
      { label:'Tổng đài khẩn cấp QG', num:'112',      color:'#c62828' },
      { label:'Cứu hộ giao thông',    num:'19008099', color:'#555'    },
      { label:'Điện lực',             num:'19001006', color:'#f39c12' },
      { label:'Cấp nước',             num:'19001047', color:'#2980b9' }
    ], call:'' },
  // 10
  { num:'', icon:'🛡️', accent:'#c62828', title:'SafeQR – QR Khẩn Cấp',
    closing: true,
    text: '<strong style="font-size:1.1em">Quét nhanh, hỗ trợ kịp thời</strong><br><br>Luôn giữ bình tĩnh trong mọi tình huống khẩn cấp.<br><br>Hành động đúng – cứu sống con người.<br><br>🧠 Học và ghi nhớ các bước sơ cứu cơ bản.<br>📤 Chia sẻ kiến thức này cho gia đình và bạn bè.<br><br><em>"Trong khẩn cấp, kiến thức là vàng."</em>',
    call:'' }
];

// ── 5. Spread layout ──────────────────────────────────────
// spread 0: [CoverInside | topic[0]]
// spread 1: [topic[1]    | topic[2]]
// spread 2: [topic[3]    | topic[4]]
// spread 3: [topic[5]    | topic[6]]
// spread 4: [topic[7]    | topic[8]]
// spread 5: [topic[9]    | null (back cover)]

function getLeftOf(i) {
  if (i === 0) return COVER_INSIDE;
  return topics[(i - 1) * 2 + 1] || null;
}
function getRightOf(i) {
  if (i === totalSpreads - 1) return null;
  return topics[i * 2] || null;
}

// ── 6. Render helpers ─────────────────────────────────────
function renderCoverInside() {
  return '<div class="cover-inside">'
    + '<div class="cover-inside-pattern"></div>'
    + '<div class="cover-inside-content">'
    + '<svg width="44" height="44" viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="#8b0000"/><path d="M18 6L24 12V22L18 28L12 22V12L18 6Z" fill="white" opacity="0.85"/></svg>'
    + '<h2 class="cover-inside-title">SỔ TAY<br>SƠ CỨU</h2>'
    + '<p class="cover-inside-sub">Hướng dẫn xử lý nhanh<br>các tình huống khẩn cấp</p>'
    + '<p class="cover-inside-brand">SafeQR</p>'
    + '</div></div>';
}

function renderTopic(t) {
  if (!t) return '';
  if (t.coverInside) return renderCoverInside();
  var ac = t.accent || '#e53935';
  var style = ' style="--accent:' + ac + '"';
  var html = '';
  if (t.num)   html += '<div class="topic-num"' + style + '>' + t.num + '</div>';
  if (t.icon)  html += '<div class="topic-icon">' + t.icon + '</div>';
  if (t.title) html += '<div class="topic-title"' + style + '>' + t.title + '</div>';
  if (t.closing) {
    html += '<div class="closing-text"><p>' + t.text + '</p></div>';
  } else if (t.numbers) {
    html += '<div class="emergency-grid">';
    t.numbers.forEach(function (n) {
      html += '<div class="em-card" style="border-left:3px solid ' + n.color + '">'
            + '<span class="em-card-label">' + n.label + '</span>'
            + '<span class="em-card-num" style="color:' + n.color + '">' + n.num + '</span>'
            + '</div>';
    });
    html += '</div>';
  } else if (t.fast) {
    html += '<div class="fast-box">';
    t.fast.forEach(function (f) { html += '<div class="fast-row">' + f + '</div>'; });
    html += '</div>';
    if (t.tips) html += '<div class="topic-tip">' + t.tips + '</div>';
  } else if (t.items) {
    html += '<ol class="topic-list">';
    t.items.forEach(function (item) { html += '<li>' + item + '</li>'; });
    html += '</ol>';
  }
  if (t.call) html += '<div class="topic-cta"' + style + '>📞 ' + t.call + '</div>';
  return html;
}

// ── 7. setSpread() – instant content swap ─────────────────
function setSpread(idx) {
  var left  = getLeftOf(idx);
  var right = getRightOf(idx);

  var leftEl  = document.getElementById('pageLeftContent');
  var rightEl = document.getElementById('pageRightContent');

  // Left page
  if (left && left.coverInside) {
    leftEl.className = 'page-inner no-pad';
    leftEl.innerHTML = renderCoverInside();
  } else {
    leftEl.className = 'page-inner';
    leftEl.innerHTML = renderTopic(left);
  }

  // Right page
  rightEl.className = 'page-inner';
  rightEl.innerHTML = renderTopic(right);
}

// ── 8. goToSpread() – fade transition ────────────────────
function goToSpread(targetIndex) {
  if (isAnimating) return;
  if (targetIndex === currentSpread) return;
  if (targetIndex < 0 || targetIndex >= totalSpreads) return;
  if (!bookOpened) return;

  isAnimating = true;

  var leftEl  = document.getElementById('pageLeftContent');
  var rightEl = document.getElementById('pageRightContent');

  // Fade out
  leftEl.style.transition  = 'opacity 0.18s ease';
  rightEl.style.transition = 'opacity 0.18s ease';
  leftEl.style.opacity  = '0';
  rightEl.style.opacity = '0';

  setTimeout(function () {
    // Disable entry animation during programmatic swap
    leftEl.style.animation  = 'none';
    rightEl.style.animation = 'none';

    setSpread(targetIndex);
    currentSpread = targetIndex;
    updateIndicators();

    // Force reflow
    void leftEl.offsetWidth;
    void rightEl.offsetWidth;

    // Fade in
    leftEl.style.opacity  = '1';
    rightEl.style.opacity = '1';

    setTimeout(function () {
      // Restore natural state — remove all inline overrides
      leftEl.style.transition  = '';
      rightEl.style.transition = '';
      leftEl.style.opacity     = '';
      rightEl.style.opacity    = '';
      leftEl.style.animation   = '';
      rightEl.style.animation  = '';
      isAnimating = false;
    }, 220);
  }, 200);
}

// ── 9. Book open / close ──────────────────────────────────
function openBook() {
  if (bookOpened) return;
  bookOpened = true;

  document.getElementById('cover').classList.add('is-open');
  document.getElementById('bookScene').classList.add('is-open');

  setTimeout(function () {
    setSpread(0);
    document.getElementById('controls').classList.add('visible');
    document.getElementById('tocBtn').classList.add('visible');
    document.getElementById('closeBtn').classList.add('visible');
    updateIndicators();
  }, 750);
}

function closeBook() {
  if (!bookOpened) return;
  bookOpened    = false;
  currentSpread = 0;
  isAnimating   = false;

  document.getElementById('cover').classList.remove('is-open');
  document.getElementById('bookScene').classList.remove('is-open');
  document.getElementById('controls').classList.remove('visible');
  document.getElementById('tocBtn').classList.remove('visible');
  document.getElementById('closeBtn').classList.remove('visible');
  closeTOC();

  setTimeout(function () {
    var leftEl  = document.getElementById('pageLeftContent');
    var rightEl = document.getElementById('pageRightContent');
    leftEl.className  = 'page-inner';
    leftEl.style.opacity = '';
    leftEl.style.transition = '';
    leftEl.innerHTML  = '';
    rightEl.innerHTML = '';
    rightEl.style.opacity = '';
    rightEl.style.transition = '';
    updateIndicators();
  }, 880);
}

// ── 10. Indicators ────────────────────────────────────────
function updateIndicators() {
  document.getElementById('pageIndicator').textContent =
    (currentSpread + 1) + ' / ' + totalSpreads;
  document.getElementById('btnPrev').disabled = currentSpread === 0;
  document.getElementById('btnNext').disabled = currentSpread === totalSpreads - 1;
  document.querySelectorAll('.dot').forEach(function (d, i) {
    d.classList.toggle('active', i === currentSpread);
    d.setAttribute('aria-selected', i === currentSpread ? 'true' : 'false');
  });
  document.querySelectorAll('.toc-item').forEach(function (item, i) {
    item.classList.toggle('active', i === currentSpread);
  });
}

function initDots() {
  var container = document.getElementById('dots');
  container.innerHTML = '';
  for (var i = 0; i < totalSpreads; i++) {
    var btn = document.createElement('button');
    btn.className = 'dot' + (i === 0 ? ' active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-label', 'Trang ' + (i + 1));
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.setAttribute('data-index', i);
    btn.addEventListener('click', function () {
      goToSpread(parseInt(this.getAttribute('data-index'), 10));
    });
    container.appendChild(btn);
  }
}

function initTOC() {
  var labels = [
    'Bìa trong  🔥  Sơ cứu bỏng',
    '🚒  Thoát hiểm cháy  |  🧠  Đột quỵ',
    '❤️  Hồi sức CPR  |  ⚡  Điện giật',
    '🚗  Tai nạn GT  |  🌊  Đuối nước',
    '🤢  Ngộ độc TP  |  📋  SĐT khẩn cấp',
    '🛡️  SafeQR  |  Bìa sau'
  ];
  var panel = document.getElementById('tocPanel');
  panel.innerHTML = '';
  labels.forEach(function (label, i) {
    var item = document.createElement('div');
    item.className = 'toc-item' + (i === 0 ? ' active' : '');
    item.textContent = label;
    item.setAttribute('data-index', i);
    item.addEventListener('click', function () {
      goToSpread(parseInt(this.getAttribute('data-index'), 10));
      closeTOC();
    });
    panel.appendChild(item);
  });
}

function toggleTOC() {
  var panel = document.getElementById('tocPanel');
  var btn   = document.getElementById('tocBtn');
  if (panel.hasAttribute('hidden')) {
    panel.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
  } else {
    closeTOC();
  }
}

function closeTOC() {
  document.getElementById('tocPanel').setAttribute('hidden', '');
  document.getElementById('tocBtn').setAttribute('aria-expanded', 'false');
}

function nextPage() { goToSpread(currentSpread + 1); }
function prevPage() { goToSpread(currentSpread - 1); }

// ── 11. DOMContentLoaded ──────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  initDots();
  initTOC();
  updateIndicators();

  var openBtn  = document.getElementById('openBtn');
  var cover    = document.getElementById('cover');
  var closeBtn = document.getElementById('closeBtn');
  var btnPrev  = document.getElementById('btnPrev');
  var btnNext  = document.getElementById('btnNext');
  var tocBtn   = document.getElementById('tocBtn');

  if (openBtn) openBtn.addEventListener('click', function (e) { e.stopPropagation(); openBook(); });

  if (cover) {
    cover.addEventListener('click', function (e) {
      if (!openBtn || !openBtn.contains(e.target)) openBook();
    });
    cover.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBook(); }
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeBook(); });
  if (btnPrev)  btnPrev.addEventListener('click', prevPage);
  if (btnNext)  btnNext.addEventListener('click', nextPage);
  if (tocBtn)   tocBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleTOC(); });

  document.addEventListener('click', function (e) {
    var panel = document.getElementById('tocPanel');
    var btn   = document.getElementById('tocBtn');
    if (!panel.hasAttribute('hidden') && !panel.contains(e.target) && !btn.contains(e.target)) {
      closeTOC();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!bookOpened) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBook(); }
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextPage(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); prevPage(); }
    if (e.key === 'Escape') closeBook();
  });

  // Touch swipe
  var scene = document.getElementById('bookScene');
  var tx0 = 0, ty0 = 0;
  scene.addEventListener('touchstart', function (e) {
    tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY;
  }, { passive: true });
  scene.addEventListener('touchend', function (e) {
    if (!bookOpened || isAnimating) return;
    var dx = e.changedTouches[0].clientX - tx0;
    var dy = e.changedTouches[0].clientY - ty0;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) {
      if (dx < 0) nextPage(); else prevPage();
    }
  }, { passive: true });
});
