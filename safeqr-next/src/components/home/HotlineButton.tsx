// ============================================
// SafeQR v2 — Hero Hotline Button
// ============================================
import React from "react";

interface HotlineButtonProps {
  number: string;
  label: string;
  color: string;
  onClick: () => void;
}

export default function HotlineButton({
  number,
  label,
  color,
  onClick,
}: HotlineButtonProps) {
  return (
    <button
      onClick={onClick}
      className="hotline-btn btn-press group flex items-center gap-3 rounded-2xl bg-white/95 px-5 py-3 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      {/* Colored dot indicator */}
      <span
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className="text-left">
        <span
          className="text-xl font-extrabold leading-tight tracking-tight"
          style={{ color }}
        >
          {number}
        </span>
        <span className="ml-2 text-xs font-medium text-warm-600">
          {label}
        </span>
      </div>
    </button>
  );
}
