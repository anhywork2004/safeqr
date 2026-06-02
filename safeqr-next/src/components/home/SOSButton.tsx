// ============================================
// SafeQR v2 — Draggable SOS Floating Button
// ============================================
import React, { useState, useCallback } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { STORAGE_KEYS, SOS_PHONE } from "@/lib/constants";
import { makeCall } from "@/lib/phone";
import { shareLocation } from "@/lib/location";
import { useToastContext } from "@/context/ToastContext";

interface SOSButtonProps {
  onCall: (phone: string, name: string, color: string) => void;
}

export default function SOSButton({ onCall }: SOSButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const { showToast } = useToastContext();

  const { ref, onPointerDown, onPointerMove, onPointerUp, isDragging } =
    useDraggable({
      storageKeyX: STORAGE_KEYS.FLOAT_SOS_X,
      storageKeyY: STORAGE_KEYS.FLOAT_SOS_Y,
      defaultRight: 16,
      defaultBottom: 140,
    });

  const handleClick = useCallback(() => {
    if (isDragging()) return;
    setExpanded(!expanded);
  }, [expanded, isDragging]);

  const handleCall112 = useCallback(() => {
    setExpanded(false);
    onCall(SOS_PHONE, "Tổng đài khẩn cấp quốc gia", "#b71c1c");
  }, [onCall]);

  const handleShare = useCallback(async () => {
    setExpanded(false);
    try {
      const ok = await shareLocation();
      if (ok) {
        showToast("Đã sao chép vị trí. Gửi cho người thân hoặc đội cứu hộ.", "info");
      }
    } catch {
      showToast("Không thể lấy vị trí. Vui lòng thử lại.", "error");
    }
  }, [showToast]);

  return (
    <>
      {/* SOS Button */}
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleClick}
        className="no-print fixed z-[100] flex cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
        style={{
          width: 62,
          height: 62,
          borderRadius: "50%",
          right: 16,
          bottom: 140,
        }}
      >
        {/* Pulse ring */}
        <div className="animate-sos-pulse absolute inset-0 rounded-full bg-red-600" />
        {/* Button */}
        <div className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-red-600 text-white shadow-sos transition-transform hover:scale-105 active:scale-95">
          <span className="text-2xl font-extrabold">SOS</span>
        </div>
      </div>

      {/* Expanded Actions */}
      {expanded && (
        <div className="no-print fixed bottom-[220px] right-4 z-[99] flex flex-col gap-2 animate-slide-up">
          <SOSAction
            label="Gọi 112"
            icon="📞"
            color="bg-red-600 hover:bg-red-700"
            onClick={handleCall112}
          />
          <SOSAction
            label="Chia sẻ vị trí"
            icon="📍"
            color="bg-red-500 hover:bg-red-600"
            onClick={handleShare}
          />
          <SOSAction
            label="Đóng"
            icon="✕"
            color="bg-warm-600 hover:bg-warm-700"
            onClick={() => setExpanded(false)}
          />
        </div>
      )}
    </>
  );
}

function SOSAction({
  label,
  icon,
  color,
  onClick,
}: {
  label: string;
  icon: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`btn-press flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${color} transition-colors`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
