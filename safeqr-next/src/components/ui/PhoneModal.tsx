// ============================================
// SafeQR v2 — Desktop Phone Number Modal
// ============================================
import React, { useEffect, useRef } from "react";
import { isMobilePhone } from "@/lib/phone";

interface PhoneModalProps {
  phone: string;
  visible: boolean;
  onClose: () => void;
}

export default function PhoneModal({ phone, visible, onClose }: PhoneModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, onClose]);

  // Don't show on mobile (can dial directly)
  if (!visible || isMobilePhone()) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(phone);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = phone;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="animate-modal-pop mx-4 w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-modal">
        <div className="mb-3 text-4xl">📞</div>
        <h2 className="mb-2 text-lg font-semibold text-warm-800">
          Số điện thoại khẩn cấp
        </h2>
        <p className="mb-4 text-5xl font-bold tracking-wide text-red-700">
          {phone}
        </p>
        <p className="mb-6 text-sm text-warm-500">
          Thiết bị của bạn không hỗ trợ gọi trực tiếp. Vui lòng quay số thủ công hoặc sao chép.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="btn-press flex-1 rounded-lg bg-warm-200 px-4 py-3 text-sm font-semibold text-warm-800 transition-colors hover:bg-warm-300"
          >
            📋 Sao chép số
          </button>
          <button
            onClick={onClose}
            className="btn-press flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
