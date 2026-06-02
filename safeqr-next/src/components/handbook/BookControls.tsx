// ============================================
// SafeQR v2 — Book Navigation Controls
// Màu hardcode — không bị dark mode ảnh hưởng
// ============================================
import React from "react";

interface BookControlsProps {
  visible: boolean;
  onPrev: () => void;
  onNext: () => void;
  currentPage: number;
  totalPages: number;
}

export default function BookControls({
  visible,
  onPrev,
  onNext,
  currentPage,
  totalPages,
}: BookControlsProps) {
  if (!visible) return null;

  const canPrev = currentPage > 0;
  const canNext = currentPage < totalPages - 1;

  return (
    <div className="fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 animate-fade-in">
      <button
        onClick={onPrev}
        disabled={!canPrev}
        className="btn-press flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-lg backdrop-blur-sm transition-colors disabled:opacity-30"
        style={{
          backgroundColor: "rgba(255,255,255,0.92)",
          color: "#1e1e1e",
          border: "1px solid rgba(0,0,0,0.08)",
          colorScheme: "only light",
        }}
        aria-label="Trang trước"
      >
        ◀
      </button>

      <span
        className="rounded-full px-4 py-2 text-xs font-semibold shadow backdrop-blur-sm"
        style={{
          backgroundColor: "rgba(255,255,255,0.88)",
          color: "#3d3d3d",
          border: "1px solid rgba(0,0,0,0.06)",
          colorScheme: "only light",
        }}
      >
        {currentPage + 1} / {totalPages}
      </span>

      <button
        onClick={onNext}
        disabled={!canNext}
        className="btn-press flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-lg backdrop-blur-sm transition-colors disabled:opacity-30"
        style={{
          backgroundColor: "rgba(255,255,255,0.92)",
          color: "#1e1e1e",
          border: "1px solid rgba(0,0,0,0.08)",
          colorScheme: "only light",
        }}
        aria-label="Trang sau"
      >
        ▶
      </button>
    </div>
  );
}
