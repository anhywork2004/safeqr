// ============================================================
// SafeQR – Notebook Handbook JS
// Real notebook open/page-flip animation
// ============================================================

// ─── Ambient Particles ────────────────────────────────────
(function () {
  var canvas = document.getElementById('particles');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ctx = canvas.getContext('2d');
  var W, H;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  var pts = Array.from({ length: 32 }, function () {
    return {
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      a: Math.random() * 0.25 + 0.04,
      c: Math.random() < 0.4 ? '229,57,53' : '175,135,75'
    };
  });
  function draw() {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -4) p.x = W + 4; if (p.x > W + 4) p.x = -4;
      if (p.y < -4) p.y = H + 4; if (p.y > H + 4) p.y = -4;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')'; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

// ─── State ────────────────────────────────────────────────
var currentSpread = 0;
var totalSpreads = 5;
var bookOpened = false;
var isFlipping = false;

// ─── Content ──────────────────────────────────────────────
var spreads = [
  {
    left: { num:'01', icon:'🔥', accent:'#e74c3c', title:'Sơ cứu khi bị bỏng',
      items: [
        'Làm mát vết bỏng dưới <strong>vòi nước sạch 15-20 phút</strong> - không dùng nước đá lạnh',
        'Tháo bỏ quần áo, trang sức quanh vùng bỏng <strong>trước khi sưng tấy</strong>',
        'Che vết bỏng bằng <strong>gạc sạch</strong> hoặc màng bọc thực phẩm',
        '<strong>Không</strong> bôi kem đánh răng, dầu, nước mắm, mỡ trăn lên vết bỏng',
        '<strong>Không</strong> làm vỡ các nốt phồng rộp - dễ gây nhiễm trùng',
        'Bỏng rộng hơn lòng bàn tay hoặc ở mặt, khớp, bộ phận sinh dục - đến viện ngay'
      ], call:'Gọi 115 nếu bỏng nặng, diện rộng' },
    right: { num:'02', icon:'🚒', accent:'#e67e22', title:'Thoát hiểm khi có cháy',
      items: [
        'Giữ <strong>bình tĩnh</strong>, không hoảng loạn - hoảng loạn là kẻ thù số một',
        'Dùng <strong>khăn ướt che mũi miệng</strong>, cúi thấp người khi di chuyển',
        'Trước khi mở cửa: <strong>dùng mu bàn tay sờ nắm cửa</strong> - nóng thì đừng mở',
        '<strong>Tuyệt đối không dùng thang máy</strong> - chỉ đi cầu thang bộ',
        'Quần áo bắt lửa: <strong>nằm xuống, lăn qua lăn lại</strong> để dập lửa',
        'Ra ban công/cửa sổ, dùng khăn sáng màu <strong>ra hiệu cầu cứu</strong>'
      ], call:'Gọi ngay 114 khi phát hiện cháy' }
  },
  {
    left: { num:'03', icon:'🧠', accent:'#e74c3c', title:'Dấu hiệu & Sơ cứu Đột quỵ',
      fast: [
        '<strong>F</strong>ace - Khuôn mặt bị lệch, méo miệng một bên, cười không đều',
        '<strong>A</strong>rms - Yếu hoặc tê liệt một bên tay, không nâng nổi cả hai tay',
        '<strong>S</strong>peech - Nói khó, nói ngọng, không rõ chữ hoặc không nói được',
        '<strong>T</strong>ime - Gọi <strong>115 NGAY LẬP TỨC</strong> - mỗi phút là hàng triệu tế bào não chết'
      ],
      tips: 'Chờ cấp cứu: để nạn nhân <strong>nằm nghiêng, đầu cao 30°</strong>, nới lỏng quần áo. <strong>Tuyệt đối không cho ăn uống</strong>. Ghi nhớ <strong>thời gian bắt đầu</strong> triệu chứng để báo bác sĩ.',
      call:'Gọi 115 - Thời gian là não!' },
    right: { num:'04', icon:'❤️', accent:'#c62828', title:'CPR - Hồi sức tim phổi',
      items: [
        'Kiểm tra <strong>an toàn khu vực</strong> trước khi tiếp cận nạn nhân',
        'Lay nhẹ vai, gọi to - không đáp ứng: <strong>gọi 115 ngay</strong>',
        'Đặt <strong>2 tay đan chéo</strong> vào giữa ngực, ấn sâu <strong>5-6 cm</strong>',
        'Tốc độ: <strong>100-120 lần/phút</strong> - đếm theo nhịp "Stayin Alive"',
        'Tỷ lệ: <strong>30 lần ép tim - 2 lần thổi ngạt</strong>',
        'Tiếp tục đến khi xe cấp cứu đến <strong>hoặc</strong> nạn nhân tỉnh lại'
      ], call:'Duy trì CPR liên tục đến khi có trợ giúp' }
  },
  {
    left: { num:'05', icon:'⚡', accent:'#f39c12', title:'Sơ cứu khi bị điện giật',
      items: [
        '<strong>Ngắt nguồn điện ngay</strong> - tắt cầu dao, aptomat, rút phích cắm',
        '<strong>Tuyệt đối không chạm</strong> trực tiếp vào nạn nhân khi chưa ngắt điện',
        'Dùng <strong>vật khô không dẫn điện</strong> (gậy gỗ, chổi nhựa) gạt dây điện',
        'Kiểm tra hô hấp - nếu ngừng tim: <strong>CPR ngay lập tức</strong>',
        'Xử lý vết bỏng điện (làm mát, che phủ gạc sạch)',
        'Nạn nhân ngã từ cao do điện giật: <strong>cố định cổ, không di chuyển</strong>'
      ], call:'Gọi 115 ngay sau khi ngắt điện an toàn' },
    right: { num:'06', icon:'🚗', accent:'#2c3e50', title:'Sơ cứu tai nạn giao thông',
      items: [
        '<strong>Đảm bảo an toàn hiện trường:</strong> bật hazard, đặt biển tam giác',
        'Gọi <strong>115</strong> (cấp cứu) và <strong>113</strong> (công an) cùng lúc',
        '<strong>Không di chuyển nạn nhân</strong> trừ khi có nguy cơ cháy nổ',
        'Cầm máu vết thương: dùng vải sạch, <strong>băng ép chặt</strong>',
        'Giữ ấm cơ thể, liên tục trấn an nạn nhân',
        '<strong>Không tháo mũ bảo hiểm</strong> nếu nghi ngờ chấn thương cột sống cổ'
      ], call:'Gọi đồng thời 115 và 113' }
  },
  {
    left: { num:'07', icon:'🌊', accent:'#2980b9', title:'Sơ cứu đuối nước',
      items: [
        'Đưa nạn nhân lên bờ <strong>an toàn</strong> - ưu tiên an toàn người cứu',
        'Khai thông đường thở: nghiêng đầu, lấy sạch dị vật trong miệng',
        '<strong>CPR ngay lập tức</strong> nếu không thở - đừng mất thời gian dốc nước',
        'Ép tim + thổi ngạt theo tỷ lệ <strong>30:2</strong>',
        'Giữ ấm cơ thể sau khi tỉnh lại - quấn chăn, áo ấm',
        '<strong>Luôn gọi 115</strong> kể cả khi đã tỉnh (nguy cơ phù phổi thứ phát)'
      ], call:'Không dốc ngược nạn nhân - CPR trước!' },
    right: { num:'08', icon:'🤢', accent:'#27ae60', title:'Ngộ độc thực phẩm',
      items: [
        'Ngừng ngay việc ăn/uống món nghi ngờ gây ngộ độc',
        '<strong>Không tự gây nôn</strong> nếu nạn nhân lơ mơ, co giật hoặc khó thở',
        'Uống nhiều nước, tốt nhất là <strong>dung dịch ORS (oresol)</strong>',
        'Giữ lại mẫu thức ăn, chất nôn để xét nghiệm',
        'Đến viện nếu: nôn nhiều, tiêu chảy nặng, sốt cao, có máu trong phân',
        'Trẻ em, người già, phụ nữ có thai: <strong>đến viện sớm hơn</strong>'
      ], call:'Gọi 115 nếu co giật, khó thở, lơ mơ' }
  },
  {
    left: { num:'📋', icon:'', accent:'#9b59b6', title:'Số điện thoại khẩn cấp',
      numbers: [
        { label:'Cấp cứu y tế', num:'115', color:'#c62828' },
        { label:'Cứu hỏa - PCCC', num:'114', color:'#e67e22' },
        { label:'Công an', num:'113', color:'#2c3e50' },
        { label:'Tổng đài khẩn cấp QG', num:'112', color:'#c62828' },
        { label:'Cứu hộ giao thông', num:'19008099', color:'#555' },
        { label:'Điện lực', num:'19001006', color:'#f39c12' },
        { label:'Cấp nước', num:'19001047', color:'#2980b9' }
      ], call:'' },
    right: { num:'', icon:'🛡️', accent:'#c62828', title:'SafeQR - QR Khẩn Cấp',
      closing: true,
      text: '<strong>Quét nhanh, hỗ trợ kịp thời</strong><br><br>Luôn giữ bình tĩnh trong mọi tình huống khẩn cấp.<br><br>Hành động đúng cứu sống con người.<br><br>Học và ghi nhớ các bước sơ cứu cơ bản.<br>Chia sẻ kiến thức này cho gia đình và bạn bè.<br><br><em>"Trong khẩn cấp, kiến thức là vàng."</em>',
      call:'' }
  }
];

// ─── Render ───────────────────────────────────────────────
function renderTopic(t) {
  var html = '';
  var style = t.accent ? ' style="--accent:' + t.accent + '"' : '';
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

function setPageContent(elId, topic, animate) {
  var el = document.getElementById(elId);
  var pc = el.querySelector('.page-content');
  pc.innerHTML = renderTopic(topic);
  if (animate) {
    pc.classList.remove('entering');
    pc.offsetHeight; // reflow
    pc.classList.add('entering');
  }
}

function renderSpread(index, animate) {
  var s = spreads[index];
  setPageContent('pageLeft', s.left, animate);
  setPageContent('pageRight', s.right, animate);
  document.getElementById('pageIndicator').textContent = (index + 1) + ' / ' + totalSpreads;
  updateNav();
  updateDots();
}

// ─── Page Flip ────────────────────────────────────────────
function flipToSpread(targetIndex) {
  if (isFlipping || targetIndex === currentSpread) return;
  if (targetIndex < 0 || targetIndex >= totalSpreads) return;
  if (!bookOpened) return;

  var forward = targetIndex > currentSpread;
  isFlipping = true;

  // Prepare next content in background pages
  var nextS = spreads[targetIndex];
  var overlay = document.getElementById('pageFlipOverlay');
  var reveal  = document.getElementById('flipReveal');

  // The overlay covers the page about to flip
  reveal.className = 'flip-reveal'; // reset

  // Place next spread content immediately (hidden behind overlay)
  // For forward: right page flips, so we update right content first, show overlay over it
  // The overlay sweeps away revealing new content underneath

  if (forward) {
    // Set new content under overlay
    setPageContent('pageRight', nextS.right, false);
    setPageContent('pageLeft',  nextS.left, false);
    // Show overlay (covers right half), then animate it away
    reveal.style.right = '0'; reveal.style.left = 'auto';
    reveal.style.transformOrigin = 'left center';
    reveal.classList.add('flip-forward');
  } else {
    setPageContent('pageLeft',  nextS.left, false);
    setPageContent('pageRight', nextS.right, false);
    reveal.style.left = '0'; reveal.style.right = 'auto';
    reveal.style.transformOrigin = 'right center';
    reveal.classList.add('flip-backward');
  }

  currentSpread = targetIndex;
  document.getElementById('pageIndicator').textContent = (targetIndex + 1) + ' / ' + totalSpreads;
  updateNav(); updateDots();

  // After animation, clean up and add content enter animation
  var dur = 520;
  setTimeout(function () {
    reveal.className = 'flip-reveal';
    // Trigger enter animation on content
    ['pageLeft', 'pageRight'].forEach(function (id) {
      var pc = document.getElementById(id).querySelector('.page-content');
      pc.classList.remove('entering');
      pc.offsetHeight;
      pc.classList.add('entering');
    });
    isFlipping = false;
  }, dur);
}

function nextPage() { if (currentSpread < totalSpreads - 1) flipToSpread(currentSpread + 1); }
function prevPage() { if (currentSpread > 0) flipToSpread(currentSpread - 1); }

function updateNav() {
  document.getElementById('btnPrev').disabled = currentSpread === 0;
  document.getElementById('btnNext').disabled = currentSpread === totalSpreads - 1;
}

// ─── Dots ─────────────────────────────────────────────────
function initDots() {
  var el = document.getElementById('pageDots');
  el.innerHTML = Array.from({ length: totalSpreads }, function (_, i) {
    return '<button class="dot' + (i === 0 ? ' active' : '') + '" onclick="flipToSpread(' + i + ')"></button>';
  }).join('');
}
function updateDots() {
  document.querySelectorAll('.dot').forEach(function (d, i) {
    d.classList.toggle('active', i === currentSpread);
  });
}

// ─── TOC ──────────────────────────────────────────────────
function initTOC() {
  var labels = [
    '01-02  🔥  Sơ cứu bỏng & Thoát hiểm khi cháy',
    '03-04  🧠  Dấu hiệu đột quỵ & Hồi sức CPR',
    '05-06  ⚡  Điện giật & Tai nạn giao thông',
    '07-08  🌊  Đuối nước & Ngộ độc thực phẩm',
    '📋     Số điện thoại khẩn cấp & SafeQR'
  ];
  document.getElementById('tocPanel').innerHTML = labels.map(function (l, i) {
    return '<div class="toc-item" onclick="goToTOC(' + i + ')">' + l + '</div>';
  }).join('');
}
function goToTOC(i) { flipToSpread(i); toggleTOC(); }
function toggleTOC() { document.getElementById('tocPanel').classList.toggle('visible'); }

// ─── Open Notebook ────────────────────────────────────────
function openNotebook() {
  if (bookOpened) return;
  bookOpened = true;

  var scene = document.getElementById('notebookScene');

  // Add open class — CSS handles the transition
  scene.classList.add('is-open');

  // After open animation completes, show controls and render content
  setTimeout(function () {
    document.getElementById('nbControls').classList.add('visible');
    document.getElementById('tocBtn').classList.add('visible');
    document.getElementById('swipeHint').style.display = 'none';
    renderSpread(0, true);
  }, 500);
}

// ─── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  initDots();
  initTOC();
  updateNav();

  // Add shimmer sweep to closed cover
  var coverFace = document.querySelector('.cover-face');
  if (coverFace) {
    var sweep = document.createElement('div');
    sweep.className = 'shimmer-sweep';
    coverFace.appendChild(sweep);
  }

  // Keyboard
  document.addEventListener('keydown', function (e) {
    if (!bookOpened) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNotebook(); }
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextPage(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); prevPage(); }
    if (e.key === 'Escape') { document.getElementById('tocPanel').classList.remove('visible'); }
  });

  // Touch swipe
  var touchX = 0, touchY = 0;
  document.getElementById('notebookScene').addEventListener('touchstart', function (e) {
    touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
  }, { passive: true });
  document.getElementById('notebookScene').addEventListener('touchend', function (e) {
    if (!bookOpened || isFlipping) return;
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) {
      if (dx < 0) nextPage(); else prevPage();
    }
  });

  // Click cover
  document.getElementById('notebookClosed').addEventListener('click', function (e) {
    if (e.target.tagName !== 'BUTTON') openNotebook();
  });

  // Close TOC on outside click
  document.addEventListener('click', function (e) {
    var panel = document.getElementById('tocPanel');
    var btn   = document.getElementById('tocBtn');
    if (panel.classList.contains('visible') && !panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.remove('visible');
    }
  });
});
