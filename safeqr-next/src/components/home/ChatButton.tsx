// ============================================
// SafeQR v2 — Draggable Chat Floating Button + Panel
// ============================================
import React, { useState, useCallback } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { STORAGE_KEYS } from "@/lib/constants";
import ChatPanel from "./ChatPanel";

export default function ChatButton() {
  const [panelOpen, setPanelOpen] = useState(false);

  const { ref, onPointerDown, onPointerMove, onPointerUp, isDragging } =
    useDraggable({
      storageKeyX: STORAGE_KEYS.FLOAT_CHAT_X,
      storageKeyY: STORAGE_KEYS.FLOAT_CHAT_Y,
      defaultRight: 16,
      defaultBottom: 60,
    });

  const handleClick = useCallback(() => {
    if (isDragging()) return;
    setPanelOpen(!panelOpen);
  }, [panelOpen, isDragging]);

  return (
    <>
      {/* Chat Float Button */}
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleClick}
        className="no-print fixed z-[100] flex cursor-grab touch-none select-none items-center justify-center rounded-full bg-chat-500 shadow-chat transition-transform hover:scale-105 active:scale-95 active:cursor-grabbing"
        style={{
          width: 56,
          height: 56,
          right: 16,
          bottom: 60,
        }}
      >
        <span className="text-2xl">
          {panelOpen ? "✕" : "💬"}
        </span>
      </div>

      {/* Chat Panel */}
      <ChatPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
