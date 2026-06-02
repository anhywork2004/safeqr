// ============================================
// SafeQR v2 — Admin Dashboard
// ============================================
import React, { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/context/ToastContext";
import { getToken } from "@/lib/auth";
import { updateContactAPI } from "@/lib/api";
import { sanitize } from "@/lib/security";
import { getItem, setItem } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import type { EmergencyContact, ContactOverride } from "@/types";
import { DEFAULT_CONTACTS } from "@/data/contacts";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { session, loading: authLoading, logout } = useAuth();
  const { showToast } = useToastContext();

  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState<EmergencyContact | null>(null);

  // Form state
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [mapsQuery, setMapsQuery] = useState("");
  const [description, setDescription] = useState("");

  // Load contact data
  useEffect(() => {
    if (!session) return;

    const defaultContact = DEFAULT_CONTACTS.find(
      (c) => c.id === session.agencyId
    );
    if (!defaultContact) return;

    // Load saved overrides from localStorage
    const overrides = getItem<Record<string, ContactOverride>>(
      STORAGE_KEYS.CONTACTS,
      {}
    );
    const override = overrides[session.agencyId];

    setContact(defaultContact);
    setPhone(override?.phone ?? defaultContact.phone);
    setAddress(override?.address ?? defaultContact.address);
    setMapsQuery(override?.mapsQuery ?? defaultContact.mapsQuery);
    setDescription(override?.description ?? defaultContact.description);
  }, [session]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/admin");
    }
  }, [authLoading, session, router]);

  const handleSave = useCallback(async () => {
    if (!session || !contact) return;

    setSaving(true);

    const cleaned: ContactOverride = {
      phone: sanitize(phone),
      address: sanitize(address),
      mapsQuery: sanitize(mapsQuery),
      description: sanitize(description),
      _updatedAt: new Date().toISOString(),
    };

    // Save to localStorage
    const overrides = getItem<Record<string, ContactOverride>>(
      STORAGE_KEYS.CONTACTS,
      {}
    );
    overrides[session.agencyId] = cleaned;
    setItem(STORAGE_KEYS.CONTACTS, overrides);

    // Try API
    if (session.useApi) {
      const token = getToken();
      if (token) {
        const result = await updateContactAPI(
          session.agencyId,
          {
            phone: cleaned.phone!,
            address: cleaned.address!,
            maps_query: cleaned.mapsQuery!,
            description: cleaned.description!,
          },
          token
        );
        if (result) {
          showToast("Đã lưu và đồng bộ lên máy chủ!", "info");
        } else {
          showToast("Đã lưu cục bộ. Không thể đồng bộ lên máy chủ.", "error");
        }
      }
    } else {
      showToast("Đã lưu thay đổi (chế độ ngoại tuyến)!", "info");
    }

    setSaving(false);
  }, [session, contact, phone, address, mapsQuery, description, showToast]);

  const handleReset = useCallback(() => {
    if (!contact) return;
    setPhone(contact.phone);
    setAddress(contact.address);
    setMapsQuery(contact.mapsQuery);
    setDescription(contact.description);
    showToast("Đã khôi phục về mặc định!", "info");
  }, [contact, showToast]);

  const handleLogout = useCallback(() => {
    logout();
    router.replace("/admin");
  }, [logout, router]);

  if (authLoading || !session || !contact) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Bảng điều khiển — SafeQR Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <Layout>
        <div className="mx-auto max-w-page-lg px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-warm-800">
                🛡️ {session.agencyName}
              </h1>
              <p className="text-sm text-warm-500">
                Cập nhật thông tin liên hệ cho đơn vị của bạn
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-press rounded-lg bg-warm-200 px-4 py-2 text-sm font-semibold text-warm-700 transition-colors hover:bg-warm-300"
            >
              Đăng xuất
            </button>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Edit Form */}
            <div className="space-y-4">
              <div className="rounded-2xl bg-white p-6 shadow-card">
                <h2 className="mb-4 text-base font-bold text-warm-800">
                  📝 Chỉnh sửa thông tin
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-warm-600">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-warm-300 bg-warm-50 px-3 py-2.5 text-sm text-warm-800 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-warm-600">
                      Địa chỉ
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-warm-300 bg-warm-50 px-3 py-2.5 text-sm text-warm-800 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-warm-600">
                      Từ khóa Google Maps
                    </label>
                    <input
                      type="text"
                      value={mapsQuery}
                      onChange={(e) => setMapsQuery(e.target.value)}
                      className="w-full rounded-lg border border-warm-300 bg-warm-50 px-3 py-2.5 text-sm text-warm-800 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-warm-600">
                      Mô tả
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-warm-300 bg-warm-50 px-3 py-2.5 text-sm text-warm-800 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-press flex-1 rounded-xl bg-red-700 px-6 py-3 text-sm font-bold text-white shadow-red transition-colors hover:bg-red-800 disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
                </button>
                <button
                  onClick={handleReset}
                  className="btn-press rounded-xl bg-warm-200 px-5 py-3 text-sm font-semibold text-warm-700 transition-colors hover:bg-warm-300"
                >
                  ↩ Khôi phục
                </button>
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <h2 className="mb-4 text-base font-bold text-warm-800">
                👁️ Xem trước
              </h2>
              <div className="card-emergency rounded-2xl bg-white p-5 shadow-card">
                <div
                  className="mb-3 flex items-center gap-3"
                  style={{ "--card-color": contact.color } as React.CSSProperties}
                >
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
                      {phone || contact.phone}
                    </p>
                  </div>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-warm-500 whitespace-pre-line">
                  {address || contact.address}
                </p>
                <p className="text-sm leading-relaxed text-warm-600">
                  {description || contact.description}
                </p>
              </div>

              <p className="mt-3 text-center text-xs text-warm-400">
                🔗{" "}
                <Link
                  href="/"
                  className="text-red-600 underline"
                  target="_blank"
                >
                  Xem trang công khai
                </Link>{" "}
                để kiểm tra thay đổi
              </p>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
