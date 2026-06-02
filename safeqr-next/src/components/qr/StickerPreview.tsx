// ============================================
// SafeQR v2 — Printable QR Sticker Preview
// ============================================
import React, { useRef, useEffect } from "react";

interface StickerPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  url: string;
  visible: boolean;
}

export default function StickerPreview({
  canvasRef,
  url,
  visible,
}: StickerPreviewProps) {
  const printCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!visible || !url) return;

    const source = canvasRef.current;
    const dest = printCanvasRef.current;
    if (!source || !dest) return;

    // Copy QR to sticker canvas
    const ctx = dest.getContext("2d");
    if (!ctx) return;

    dest.width = 420;
    dest.height = 300;

    // White card
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(0, 0, 420, 300, 16);
    ctx.fill();

    // Red top accent
    ctx.fillStyle = "#b71c1c";
    ctx.beginPath();
    ctx.roundRect(0, 0, 420, 8, 8);
    ctx.fill();

    // QR code centered
    const qrSize = 180;
    const qrX = 120;
    const qrY = 35;
    ctx.drawImage(source, qrX, qrY, qrSize, qrSize);

    // Title
    ctx.fillStyle = "#1c1c1c";
    ctx.font = "bold 18px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QR Khẩn Cấp", 210, 245);

    // URL
    ctx.fillStyle = "#8a8a86";
    ctx.font = "12px -apple-system, sans-serif";
    ctx.fillText(url.length > 50 ? url.slice(0, 47) + "..." : url, 210, 268);

    // Instruction
    ctx.fillStyle = "#4a4a4a";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillText("Quét để xem danh bạ khẩn cấp", 210, 288);
  }, [visible, url, canvasRef]);

  if (!visible) return null;

  return (
    <div className="no-print animate-fade-in mt-8">
      <h3 className="mb-3 text-center text-sm font-semibold text-warm-700">
        Xem trước sticker
      </h3>
      <canvas
        ref={printCanvasRef}
        className="mx-auto rounded-xl shadow-card"
        style={{ maxWidth: "100%", height: "auto" }}
      />
    </div>
  );
}
