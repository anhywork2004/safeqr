// ============================================
// SafeQR v2 — Footer
// ============================================
import React from "react";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-warm-200/60 px-4 py-8">
      <div className="mx-auto max-w-page-lg text-center">
        <p className="text-sm text-warm-500">
          © {new Date().getFullYear()} SafeQR — Nền tảng QR Khẩn Cấp
        </p>
        <p className="mt-1 text-xs text-warm-400">
          TP. Thủ Đức, TP. Hồ Chí Minh
        </p>
        <p className="mt-3 text-xs text-warm-400">
          ⚠️ Trang web này chỉ cung cấp thông tin tham khảo. Trong tình huống khẩn cấp, hãy gọi ngay 112 hoặc 115.
        </p>
      </div>
    </footer>
  );
}
