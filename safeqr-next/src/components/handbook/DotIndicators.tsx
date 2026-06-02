// ============================================
// SafeQR v2 — Spread Dot Navigation
// Màu hardcode — không bị dark mode ảnh hưởng
// ============================================
import React from "react";

interface DotIndicatorsProps {
  total: number;
  active: number;
  onDotClick: (index: number) => void;
}

export default function DotIndicators({
  total,
  active,
  onDotClick,
}: DotIndicatorsProps) {
  return (
    <div className="fixed right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2 animate-fade-in">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          className="rounded-full transition-all duration-300"
          style={{
            width: 8,
            height: 8,
            border: "none",
            cursor: "pointer",
            padding: 0,
            backgroundColor:
              i === active ? "#c62828" : "rgba(0,0,0,0.15)",
            boxShadow:
              i === active ? "0 0 10px rgba(183,28,28,0.35)" : "none",
            transform: i === active ? "scale(1.5)" : "scale(1)",
            colorScheme: "only light",
          }}
          aria-label={`Trang ${i + 1}`}
        />
      ))}
    </div>
  );
}
