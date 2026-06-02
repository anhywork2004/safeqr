// ============================================
// SafeQR v2 — Admin Login Form
// ============================================
import React, { useState } from "react";
import { AGENCY_OPTIONS } from "@/types";
import type { LoginCredentials } from "@/types";

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export default function LoginForm({ onSubmit, loading, error }: LoginFormProps) {
  const [agencyId, setAgencyId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyId || !password) return;
    await onSubmit({ agencyId, password });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <div className="mb-3 text-5xl">🔐</div>
        <h2 className="text-xl font-extrabold text-warm-800">
          Đăng nhập quản trị
        </h2>
        <p className="mt-1 text-sm text-warm-500">
          Dành cho đại diện các đơn vị khẩn cấp
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Agency Selector */}
      <div>
        <label
          htmlFor="agency"
          className="mb-1.5 block text-sm font-semibold text-warm-700"
        >
          Đơn vị
        </label>
        <select
          id="agency"
          value={agencyId}
          onChange={(e) => setAgencyId(e.target.value)}
          className="w-full rounded-xl border border-warm-300 bg-white px-4 py-3 text-sm text-warm-800 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          required
        >
          <option value="">— Chọn đơn vị —</option>
          {AGENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-semibold text-warm-700"
        >
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-warm-300 bg-white px-4 py-3 text-sm text-warm-800 placeholder:text-warm-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          required
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !agencyId || !password}
        className="btn-press w-full rounded-xl bg-red-700 px-6 py-3.5 text-base font-bold text-white shadow-red transition-colors hover:bg-red-800 disabled:opacity-50"
      >
        {loading ? "Đang đăng nhập..." : "🔑 Đăng nhập"}
      </button>

      {/* Hint */}
      <p className="text-center text-xs text-warm-400">
        ⚠️ Vui lòng đổi mật khẩu mặc định ngay sau lần đăng nhập đầu tiên.
      </p>
    </form>
  );
}
