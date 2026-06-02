// ============================================
// SafeQR v2 — Handbook Topic Content Renderer
// Tất cả màu đều hardcode — không bị dark mode ảnh hưởng
// ============================================
import React from "react";
import type { HandbookTopic } from "@/types";

interface TopicRendererProps {
  topic: HandbookTopic;
  isRightPage?: boolean;
}

const LIGHT_STYLE = { colorScheme: "only light" as const };

export default function TopicRenderer({ topic, isRightPage = false }: TopicRendererProps) {
  // Cover inside
  if (topic.coverInside) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center px-6 text-center"
        style={LIGHT_STYLE}
      >
        <div className="mb-4 text-6xl">📖</div>
        <h2 className="mb-2 text-lg font-bold" style={{ color: "#1e1e1e" }}>
          Sổ tay Sơ cứu
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: "#5a5a5a" }}>
          Hướng dẫn sơ cứu cơ bản cho các tình huống khẩn cấp thường gặp.
        </p>
        <p className="mt-2 text-[9px]" style={{ color: "#8a8a86" }}>
          Lướt hoặc nhấn nút để lật trang →
        </p>
        <div className="mt-4 text-[10px] font-medium" style={{ color: "#c62828" }}>
          SafeQR — QR Khẩn Cấp
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col px-1 py-1"
      style={LIGHT_STYLE}
    >
      {/* Number + Icon header */}
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
          style={{ backgroundColor: `${topic.accent}15` }}
        >
          {topic.icon}
        </span>
        <div>
          <span
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: topic.accent, opacity: 0.55 }}
          >
            Chủ đề {topic.num}
          </span>
          <h3
            className="text-sm font-extrabold leading-tight"
            style={{ color: "#1e1e1e", paddingBottom: 5, borderBottom: `2.5px solid ${topic.accent}` }}
          >
            {topic.title}
          </h3>
        </div>
      </div>

      {/* Numbered items */}
      {topic.items && (
        <ul
          className="mb-3 space-y-1 text-[11px] leading-relaxed"
          style={{ paddingLeft: "1.2em", color: "#3d3d3d" }}
        >
          {topic.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-1.5"
              style={{ marginBottom: 3 }}
              dangerouslySetInnerHTML={{
                __html: `<span style="color:${topic.accent};font-weight:700;flex-shrink:0">${i + 1}.</span> ${item}`,
              }}
            />
          ))}
        </ul>
      )}

      {/* Fast checklist */}
      {topic.fast && (
        <div
          className="mb-3 rounded-md p-2.5"
          style={{
            backgroundColor: "rgba(230,126,34,0.08)",
            borderLeft: "3px solid #e67e22",
          }}
        >
          <div
            className="mb-1 text-[10px] font-bold"
            style={{ color: "#c62828" }}
          >
            ⚡ LÀM NHANH:
          </div>
          <ul className="space-y-0.5 text-[10px] font-medium" style={{ color: "#2a2a2a" }}>
            {topic.fast.map((f, i) => (
              <li key={i}>✓ {f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tips */}
      {topic.tips && (
        <div
          className="mb-3 rounded-md p-2.5 text-[10px] leading-relaxed"
          style={{
            backgroundColor: `${topic.accent}08`,
            borderLeft: `3px solid ${topic.accent}`,
            color: "#5a5a5a",
            fontStyle: "italic",
          }}
        >
          💡 {topic.tips}
        </div>
      )}

      {/* Emergency Numbers */}
      {topic.numbers && (
        <div className="mb-3 space-y-1">
          {topic.numbers.map((n, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md px-3 py-1.5"
              style={{
                backgroundColor: "#f5f2ec",
                border: "1px solid rgba(0,0,0,0.07)",
              }}
            >
              <span
                className="text-[10px] font-semibold"
                style={{ color: "#555" }}
              >
                {n.label}
              </span>
              <span
                className="text-sm font-extrabold"
                style={{ color: n.color, fontFamily: "'JetBrains Mono', monospace" }}
              >
                {n.num}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Text */}
      {topic.text && (
        <p
          className="mb-3 text-[10px] leading-relaxed"
          style={{ color: "#444" }}
        >
          {topic.text}
        </p>
      )}

      {/* Closing */}
      {topic.closing && (
        <div className="mt-auto text-center">
          <div className="mb-2 text-3xl">🆘</div>
        </div>
      )}

      {/* Call to action */}
      <div
        className="mt-auto rounded-md px-3 py-2 text-center text-[10px] font-bold text-white"
        style={{
          backgroundColor: topic.accent,
          boxShadow: `0 3px 12px ${topic.accent}40`,
        }}
      >
        {topic.call}
      </div>
    </div>
  );
}
