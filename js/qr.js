// SafeQR – QR Poster Generator (external)
// Extracted from qr/index.html for CSP compliance (no unsafe-inline).

// ============================================================
// EVENT DELEGATION — Replaces inline onclick for CSP compliance
// ============================================================
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

(function () {
  'use strict';

  var _currentFormat = 'a4-portrait';
  var _currentQRData = null;

  var POSTER_SIZES = {
    'a4-portrait':  { width: 1240, height: 1754, name: 'A4 dọc' },
    'a4-landscape': { width: 1754, height: 1240, name: 'A4 ngang' },
    'a5-portrait':  { width: 1240, height: 874,  name: 'A5 dọc' },
    'large':        { width: 2480, height: 3508, name: 'Lớn (A3/A2)' },
  };

  function getPosterSize(format) {
    return POSTER_SIZES[format] || POSTER_SIZES['a4-portrait'];
  }

  function makeQR(url) {
    var typeNumber = 6;
    var errorCorrection = 'M';
    var qr = qrcode(typeNumber, errorCorrection);
    qr.addData(url);
    qr.make();
    return qr;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function drawPoster(format) {
    _currentFormat = format;
    var size = getPosterSize(format);
    var canvas = document.getElementById('posterCanvas');
    var ctx = canvas.getContext('2d');

    canvas.width = size.width;
    canvas.height = size.height;

    var W = size.width;
    var H = size.height;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Red top/bottom bars
    var barH = Math.round(H * 0.018);
    ctx.fillStyle = '#c62828';
    ctx.fillRect(0, 0, W, barH);
    ctx.fillRect(0, H - barH, W, barH);

    // Left red stripe
    var stripeW = Math.round(W * 0.012);
    ctx.fillStyle = '#c62828';
    ctx.fillRect(0, 0, stripeW, H);

    // Inner border
    var margin = Math.round(Math.min(W, H) * 0.04);
    ctx.strokeStyle = '#e0dcd2';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin, margin, W - 2 * margin, H - 2 * margin);

    // Header section
    var headerY = margin + Math.round(H * 0.04);
    var contentX = margin + Math.round(W * 0.05);
    var contentW = W - 2 * (margin + Math.round(W * 0.05));

    // SafeQR badge
    var badgeW = Math.round(W * 0.22);
    var badgeH = Math.round(H * 0.06);
    var badgeX = contentX;
    ctx.fillStyle = '#c62828';
    roundRect(ctx, badgeX, headerY, badgeW, badgeH, Math.round(badgeH * 0.35));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    var badgeFontSize = Math.round(badgeH * 0.5);
    ctx.font = 'bold ' + badgeFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SAFEQR', badgeX + badgeW / 2, headerY + badgeH / 2);

    // Title
    var titleX = badgeX + badgeW + Math.round(W * 0.03);
    var titleFontSize = Math.round(H * 0.04);
    ctx.fillStyle = '#1c1c1c';
    ctx.font = '900 ' + titleFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('QR KHẨN CẤP', titleX, headerY);

    var subFontSize = Math.round(H * 0.022);
    ctx.fillStyle = '#616161';
    ctx.font = '600 ' + subFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Quét nhanh – Hỗ trợ kịp thời', titleX, headerY + titleFontSize + Math.round(H * 0.006));

    // Locality name
    var locName = (document.getElementById('localityName').value || '').trim();
    if (locName) {
      var locFontSize = Math.round(H * 0.026);
      ctx.fillStyle = '#b71c1c';
      ctx.font = '700 ' + locFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('📍 ' + locName, titleX, headerY + titleFontSize + subFontSize + Math.round(H * 0.018));
    }

    // QR Code area
    var qrAreaTop = headerY + badgeH + Math.round(H * 0.06);
    var qrAreaBottom = H - margin - Math.round(H * 0.30);
    var qrAreaHeight = qrAreaBottom - qrAreaTop;
    var qrPixelSize = Math.round(W * 0.52);
    if (qrPixelSize > qrAreaHeight * 0.9) qrPixelSize = Math.round(qrAreaHeight * 0.9);

    var url = document.getElementById('qrUrl').value.trim();
    if (url) {
      var qr = makeQR(url);
      var cellSize = Math.floor(qrPixelSize / qr.getModuleCount());
      var canvasQrSize = cellSize * qr.getModuleCount();
      var qrX = Math.round((W - canvasQrSize) / 2);
      var qrY = Math.round(qrAreaTop + (qrAreaHeight - canvasQrSize) / 2);
      var qrPad = Math.round(cellSize * 3);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX - qrPad, qrY - qrPad, canvasQrSize + 2 * qrPad, canvasQrSize + 2 * qrPad);
      ctx.shadowColor = 'rgba(0,0,0,0.10)';
      ctx.shadowBlur = Math.round(W * 0.015);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX - qrPad, qrY - qrPad, canvasQrSize + 2 * qrPad, canvasQrSize + 2 * qrPad);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#c62828';
      ctx.lineWidth = Math.round(W * 0.004);
      ctx.strokeRect(qrX - qrPad, qrY - qrPad, canvasQrSize + 2 * qrPad, canvasQrSize + 2 * qrPad);

      ctx.fillStyle = '#c62828';
      for (var row = 0; row < qr.getModuleCount(); row++) {
        for (var col = 0; col < qr.getModuleCount(); col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(qrX + col * cellSize, qrY + row * cellSize, cellSize, cellSize);
          }
        }
      }
    }

    // Text under QR
    var belowQRY = qrAreaBottom - Math.round(H * 0.04);
    ctx.fillStyle = '#1c1c1c';
    var scanFontSize = Math.round(H * 0.025);
    ctx.font = '800 ' + scanFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📷 Quét mã QR bằng camera điện thoại', W / 2, belowQRY);
    ctx.fillStyle = '#616161';
    var scanSubSize = Math.round(H * 0.018);
    ctx.font = '500 ' + scanSubSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Không cần cài ứng dụng · Hỗ trợ iPhone & Android', W / 2, belowQRY + scanFontSize + Math.round(H * 0.01));

    // Instructions box
    var instHeaderSize = Math.round(H * 0.02);
    var stepFontSize = Math.round(H * 0.018);
    var stepLineH = Math.round(H * 0.034);
    var calloutH = Math.round(H * 0.042);
    var instPadX = Math.round(W * 0.05);
    var instPadTop = Math.round(H * 0.022);
    var instPadBot = Math.round(H * 0.02);
    var gapAfterSteps = Math.round(H * 0.018);

    var totalContentH = instPadTop + instHeaderSize + Math.round(H * 0.014) + 4 * stepLineH + gapAfterSteps + calloutH + instPadBot;
    var instY = qrAreaBottom + Math.round(H * 0.018);
    var instW = contentW * 0.9;
    var instX = (W - instW) / 2;
    var instH = totalContentH;
    var maxInstH = H - margin - instY - Math.round(H * 0.025) - barH;
    if (instH > maxInstH) instH = maxInstH;

    ctx.fillStyle = '#fafaf7';
    ctx.strokeStyle = '#e8e4db';
    ctx.lineWidth = 1;
    roundRect(ctx, instX, instY, instW, instH, Math.round(Math.min(instH * 0.06, 10)));
    ctx.fill();
    ctx.stroke();

    var curY = instY + instPadTop;
    ctx.fillStyle = '#c62828';
    ctx.font = '800 ' + instHeaderSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('📋 KHI GẶP TÌNH HUỐNG KHẨN CẤP:', instX + instPadX, curY);
    curY += instHeaderSize + Math.round(H * 0.014);

    ctx.fillStyle = '#1c1c1c';
    ctx.font = '600 ' + stepFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    var steps = [
      '1. Mở camera điện thoại, hướng vào mã QR này.',
      '2. Trang khẩn cấp hiện ra → xem vị trí + số điện thoại cứu hộ gần nhất.',
      '3. Bấm nút GỌI NGAY (115 Cấp cứu · 114 Cứu hỏa · 113 Công an).',
      '4. Gửi vị trí qua nút SOS để lực lượng chức năng định vị chính xác.'
    ];
    for (var s = 0; s < steps.length; s++) {
      ctx.fillText(steps[s], instX + instPadX, curY);
      curY += stepLineH;
    }

    // Emergency numbers callout
    curY += gapAfterSteps;
    var calloutW = instW * 0.9;
    var calloutX = instX + (instW - calloutW) / 2;
    ctx.fillStyle = '#c62828';
    roundRect(ctx, calloutX, curY, calloutW, calloutH, Math.round(calloutH * 0.35));
    ctx.fill();
    var calloutFontSize = Math.round(calloutH * 0.48);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 ' + calloutFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('115 Cấp cứu  ·  114 Cứu hỏa  ·  113 Công an  ·  112 Tổng đài', calloutX + calloutW / 2, curY + calloutH / 2);

    // Footer
    var footerY = H - margin - Math.round(H * 0.012);
    var footerFontSize = Math.round(H * 0.015);
    ctx.fillStyle = '#b0b0aa';
    ctx.font = '500 ' + footerFontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('SafeQR – Mô hình chuyển đổi số cộng đồng · Miễn phí · Không cần cài ứng dụng · Chi phí 0đ', W / 2, footerY);

    _currentQRData = { url: url, localityName: locName, format: format, canvas: canvas };

    document.getElementById('posterSection').classList.add('visible');
    var tabs = document.querySelectorAll('.poster-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].dataset.format === format);
    }
  }

  window.generatePoster = function () {
    var url = document.getElementById('qrUrl').value.trim();
    if (!url) { alert('Vui lòng nhập URL trang khẩn cấp.'); return; }
    if (url.indexOf('http') !== 0) { alert('URL phải bắt đầu bằng http:// hoặc https://'); return; }
    _currentFormat = document.getElementById('qrSize').value;
    drawPoster(_currentFormat);
    document.getElementById('posterSection').scrollIntoView({ behavior: 'smooth' });
  };

  window.switchPosterFormat = function (format) {
    if (!_currentQRData) return;
    drawPoster(format);
  };

  window.downloadPoster = function () {
    if (!_currentQRData) return;
    var canvas = _currentQRData.canvas;
    var link = document.createElement('a');
    var locName = (_currentQRData.localityName || 'dia-phuong').toLowerCase()
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 40);
    link.download = 'safeqr-poster-' + locName + '-' + _currentQRData.format + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  window.printPoster = function () {
    window.print();
  };

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    var urlInput = document.getElementById('qrUrl');
    if (!urlInput.value) {
      urlInput.value = window.location.origin + window.location.pathname.replace(/qr\/.*/, '');
    }
    var locInput = document.getElementById('localityName');
    if (!locInput.value && typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.locality) {
      locInput.value = SITE_CONFIG.locality;
    }
  });
})();
