// ============================================
// SafeQR v2 — QR Code Generator Page
// ============================================
import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Script from "next/script";
import Link from "next/link";
import Layout from "@/components/layout/Layout";
import QRForm from "@/components/qr/QRForm";
import QRCanvas from "@/components/qr/QRCanvas";
import StickerPreview from "@/components/qr/StickerPreview";
import { useToastContext } from "@/context/ToastContext";

export default function QRPage() {
  const [url, setUrl] = useState("");
  const [size, setSize] = useState(320);
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showToast } = useToastContext();

  // Set default URL to current origin
  useEffect(() => {
    if (typeof window !== "undefined") {
      setUrl(window.location.origin);
    }
  }, []);

  const handleGenerate = (newUrl: string, newSize: number) => {
    setUrl(newUrl);
    setSize(newSize);
    setVisible(true);
    showToast("Đã tạo mã QR thành công!", "info");
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      showToast("Vui lòng tạo mã QR trước", "error");
      return;
    }
    const link = document.createElement("a");
    link.download = `safeqr-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Đã tải xuống mã QR!", "info");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Head>
        <title>Tạo mã QR Khẩn Cấp — SafeQR</title>
        <meta
          name="description"
          content="Tạo mã QR cho danh bạ khẩn cấp. In sticker để dán ở những nơi dễ thấy."
        />
      </Head>

      {/* Load qrcode-generator from CDN */}
      <Script
        src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"
        strategy="afterInteractive"
      />

      <Layout>
        <div className="mx-auto max-w-page-lg px-4 py-8">
          {/* Back link */}
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-warm-500 transition-colors hover:text-warm-700"
          >
            ← Về trang chủ
          </Link>

          <h1 className="mb-2 text-2xl font-extrabold text-warm-800 sm:text-3xl">
            📱 Tạo mã QR Khẩn Cấp
          </h1>
          <p className="mb-8 text-sm text-warm-500">
            Tạo mã QR dẫn đến trang danh bạ khẩn cấp. In ra và dán ở những nơi dễ thấy.
          </p>

          {/* Form */}
          <QRForm
            defaultUrl={url}
            sizeOptions={[256, 320, 400, 512]}
            onGenerate={handleGenerate}
          />

          {/* QR Result */}
          <QRCanvas url={url} size={size} visible={visible} />

          {/* Actions */}
          {visible && (
            <div className="no-print animate-slide-up mt-6 flex justify-center gap-3">
              <button
                onClick={handleDownload}
                className="btn-press rounded-xl bg-red-700 px-6 py-3 text-sm font-bold text-white shadow-red transition-colors hover:bg-red-800"
              >
                📥 Tải PNG
              </button>
              <button
                onClick={handlePrint}
                className="btn-press rounded-xl bg-warm-200 px-6 py-3 text-sm font-bold text-warm-700 transition-colors hover:bg-warm-300"
              >
                🖨️ In sticker
              </button>
            </div>
          )}

          {/* Sticker Preview */}
          <StickerPreview
            canvasRef={canvasRef}
            url={url}
            visible={visible}
          />
        </div>
      </Layout>
    </>
  );
}
