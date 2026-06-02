// ============================================
// SafeQR v2 — Toast Notification Component
// ============================================
import React from "react";
import { useToastContext } from "@/context/ToastContext";

export default function Toast() {
  const { toast, hideToast } = useToastContext();

  if (!toast.visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      onClick={hideToast}
      className={`
        fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2
        animate-slide-up cursor-pointer rounded-xl px-5 py-3
        text-sm font-medium shadow-lg backdrop-blur-md
        ${
          toast.type === "error"
            ? "bg-red-600/95 text-white"
            : "bg-warm-800/95 text-white"
        }
      `}
    >
      {toast.message}
    </div>
  );
}
