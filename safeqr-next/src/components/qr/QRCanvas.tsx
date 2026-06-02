// ============================================
// SafeQR v2 — QR Code Canvas Renderer
// ============================================
import React, { useRef, useEffect, forwardRef } from "react";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function qrcode(type: number, errorCorrection: string): any;
}

interface QRCanvasProps {
  url: string;
  size: number;
  visible: boolean;
}

const QRCanvas = forwardRef<HTMLCanvasElement, QRCanvasProps>(
  function QRCanvas({ url, size, visible }, ref) {
    const innerRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || innerRef;

    useEffect(() => {
      if (!visible || !url || typeof window === "undefined") return;

      const renderQR = () => {
        if (typeof qrcode === "undefined") {
          setTimeout(renderQR, 100);
          return;
        }

        const canvas = (ref as React.RefObject<HTMLCanvasElement>)?.current || innerRef.current;
        if (!canvas) return;

        const qr = qrcode(0, "M");
        qr.addData(url);
        qr.make();

        const moduleCount = qr.getModuleCount();
        const cellSize = Math.floor(size / moduleCount);
        const actualSize = cellSize * moduleCount;

        canvas.width = actualSize;
        canvas.height = actualSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(0, 0, actualSize, actualSize, 8);
        ctx.fill();

        // Draw QR modules
        for (let row = 0; row < moduleCount; row++) {
          for (let col = 0; col < moduleCount; col++) {
            if (qr.isDark(row, col)) {
              ctx.fillStyle = "#1c1c1c";
              const x = col * cellSize + 1;
              const y = row * cellSize + 1;
              const w = cellSize - 2;
              const h = cellSize - 2;
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, 2);
              ctx.fill();
            }
          }
        }
      };

      renderQR();
    }, [url, size, visible]);

    if (!visible) return null;

    return (
      <div className="animate-fade-in mt-8 flex justify-center">
        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-card"
          style={{ maxWidth: "100%", height: "auto" }}
        />
      </div>
    );
  }
);

export default QRCanvas;
