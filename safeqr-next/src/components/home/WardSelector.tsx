// ============================================
// SafeQR v2 — Ward / Phường Selector Modal
// Cho phép người dùng chọn phường thủ công
// ============================================
import React, { useState } from "react";
import { WARDS, searchWards, type WardInfo } from "@/data/wards";

interface WardSelectorProps {
  onSelect: (ward: WardInfo) => void;
  onClose: () => void;
}

export default function WardSelector({ onSelect, onClose }: WardSelectorProps) {
  const [query, setQuery] = useState("");

  const filtered = query.trim() ? searchWards(query) : WARDS;

  return (
    <div
      className="no-print fixed inset-0 z-[200] flex items-start justify-center bg-black/30 pt-[15vh] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-modal-pop mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-modal">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-extrabold text-gray-800">
            📍 Chon phuong cua ban
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tim phuong... (vd: Hiep Phu, Linh Trung)"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20"
            autoFocus
          />
        </div>

        {/* Ward list */}
        <div className="max-h-[45vh] overflow-y-auto px-2 py-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Khong tim thay phuong nao phu hop
            </p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((ward) => (
                <button
                  key={ward.id}
                  onClick={() => onSelect(ward)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-red-50"
                >
                  <div>
                    <span className="font-semibold text-gray-800">
                      {ward.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {ward.policeStation.split(" — ")[0]}
                    </span>
                  </div>
                  <span className="text-red-500 opacity-0 transition-opacity group-hover:opacity-100">
                    →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-100 px-5 py-3">
          <p className="text-[11px] leading-relaxed text-gray-400">
            ⚠️ Du liệu phuong đang trong qua trinh xac minh.
            Vui long kiem tra lại sổ điẹn thoại truớc khi goi.
            Goi <strong className="text-red-600">113</strong> nếu can hỗ trợ khan cap.
          </p>
        </div>
      </div>
    </div>
  );
}
