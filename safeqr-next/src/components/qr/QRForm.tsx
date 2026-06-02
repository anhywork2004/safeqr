// ============================================
// SafeQR v2 — QR Code Generator Form
// ============================================
import React, { useState } from "react";

interface QRFormProps {
  defaultUrl: string;
  sizeOptions: number[];
  onGenerate: (url: string, size: number) => void;
}

export default function QRForm({
  defaultUrl,
  sizeOptions,
  onGenerate,
}: QRFormProps) {
  const [url, setUrl] = useState(defaultUrl);
  const [size, setSize] = useState(320);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onGenerate(url.trim(), size);
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-5">
      {/* URL Input */}
      <div>
        <label
          htmlFor="qr-url"
          className="mb-1.5 block text-sm font-semibold text-warm-700"
        >
          Đường dẫn (URL)
        </label>
        <input
          id="qr-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://safeqr.io"
          className="w-full rounded-xl border border-warm-300 bg-white px-4 py-3 text-sm text-warm-800 placeholder:text-warm-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          required
        />
      </div>

      {/* Size Selector */}
      <div>
        <label
          htmlFor="qr-size"
          className="mb-1.5 block text-sm font-semibold text-warm-700"
        >
          Kích thước (px)
        </label>
        <div className="flex gap-2">
          {sizeOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`btn-press flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                size === s
                  ? "bg-red-600 text-white"
                  : "bg-warm-200 text-warm-700 hover:bg-warm-300"
              }`}
            >
              {s}px
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        type="submit"
        className="btn-press w-full rounded-xl bg-red-700 px-6 py-3.5 text-base font-bold text-white shadow-red transition-colors hover:bg-red-800"
      >
        🎯 Tạo mã QR
      </button>
    </form>
  );
}
