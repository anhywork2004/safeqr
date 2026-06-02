// ============================================
// SafeQR v2 — Extra Emergency Numbers (Collapsible)
// ============================================
import React, { useState } from "react";
import type { ExternalNumber } from "@/types";
import { makeCall } from "@/lib/phone";

interface ExtraNumbersProps {
  numbers: ExternalNumber[];
  onCall: (phone: string, name: string, color: string) => void;
}

export default function ExtraNumbers({ numbers, onCall }: ExtraNumbersProps) {
  const [open, setOpen] = useState(false);

  if (!numbers.length) return null;

  return (
    <section className="mx-auto mt-6 max-w-page-lg px-4">
      <button
        onClick={() => setOpen(!open)}
        className="btn-press flex w-full items-center justify-between rounded-xl bg-white px-5 py-4 shadow-card transition-shadow hover:shadow-card-hover"
      >
        <span className="text-sm font-semibold text-warm-700">
          📋 Danh sách số khẩn cấp khác
        </span>
        <span
          className={`text-warm-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="mt-2 animate-slide-up space-y-1 rounded-xl bg-white p-4 shadow-card">
          {numbers.map((n, i) => (
            <button
              key={i}
              onClick={() => onCall(n.phone, n.name, "#2c3e50")}
              className="btn-press flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-warm-50"
            >
              <span className="text-sm font-medium text-warm-700">
                {n.name}
              </span>
              <span className="text-sm font-bold text-red-700">{n.phone}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
