// ============================================
// SafeQR v2 — Emergency Contact Card
// ============================================
import React from "react";
import type { EmergencyContact } from "@/types";
import { makeCall, openMaps } from "@/lib/phone";

interface ContactCardProps {
  contact: EmergencyContact;
  onCall: (phone: string, name: string, color: string) => void;
  onMaps: (query: string) => void;
  loading?: boolean;
}

export default function ContactCard({
  contact,
  onCall,
  onMaps,
  loading = false,
}: ContactCardProps) {
  if (loading) {
    return (
      <div
        className="card-emergency animate-pulse p-5"
        style={{ "--card-color": contact.color } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-warm-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-warm-200" />
            <div className="h-3 w-1/3 rounded bg-warm-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <article
      className="card-emergency group p-5"
      style={{ "--card-color": contact.color } as React.CSSProperties}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
          style={{ backgroundColor: `${contact.color}15` }}
        >
          {contact.icon}
        </span>
        <div className="flex-1">
          <h3 className="text-base font-bold leading-tight text-warm-800">
            {contact.name}
          </h3>
          <p
            className="text-xl font-extrabold tracking-tight"
            style={{ color: contact.color }}
          >
            {contact.phone}
          </p>
        </div>
      </div>

      {/* Address (collapsible on mobile) */}
      <p className="mb-3 text-xs leading-relaxed text-warm-500 whitespace-pre-line">
        {contact.address}
      </p>

      {/* Description */}
      <p className="mb-4 text-sm leading-relaxed text-warm-600">
        {contact.description}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onCall(contact.phone, contact.name, contact.color)}
          className="btn-press flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: contact.color }}
        >
          📞 Gọi ngay
        </button>
        <button
          onClick={() => onMaps(contact.mapsQuery)}
          className="btn-press flex items-center justify-center gap-1.5 rounded-lg bg-warm-200 px-4 py-2.5 text-sm font-medium text-warm-700 transition-colors hover:bg-warm-300"
          title="Xem bản đồ"
        >
          📍 Bản đồ
        </button>
      </div>
    </article>
  );
}
