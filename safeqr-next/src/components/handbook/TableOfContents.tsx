// ============================================
// SafeQR v2 — Table of Contents Overlay
// Màu hardcode — không bị dark mode ảnh hưởng
// ============================================
import React from "react";
import { SPREADS } from "@/data/handbook-topics";

interface TableOfContentsProps {
  isOpen: boolean;
  active: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function TableOfContents({
  isOpen,
  active,
  onSelect,
  onClose,
}: TableOfContentsProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(4px)",
        colorScheme: "only light",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-modal-pop mx-4 max-h-[70vh] w-full max-w-sm overflow-y-auto rounded-2xl p-6"
        style={{
          backgroundColor: "#ffffff",
          boxShadow: "0 14px 44px rgba(0,0,0,0.12)",
          colorScheme: "only light",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3
            className="text-lg font-bold"
            style={{ color: "#1e1e1e", colorScheme: "only light" }}
          >
            📑 Mục lục
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{
              color: "#8a8a86",
              colorScheme: "only light",
            }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-1">
          {SPREADS.map((spread, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(i);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
              style={{
                backgroundColor:
                  i === active ? "rgba(183,28,28,0.06)" : "transparent",
                color: i === active ? "#b71c1c" : "#4a4a4a",
                fontWeight: i === active ? 600 : 400,
                borderLeft:
                  i === active ? "2px solid #b71c1c" : "2px solid transparent",
                colorScheme: "only light",
              }}
            >
              <span className="text-base">{spread.label.slice(0, 2)}</span>
              <span>{spread.label.slice(2)}</span>
              {i === active && (
                <span className="ml-auto text-xs" style={{ color: "#c62828" }}>
                  ◀ đang xem
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
