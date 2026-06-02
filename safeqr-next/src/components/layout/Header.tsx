// ============================================
// SafeQR v2 — Sticky Glass Header
// ============================================
import React from "react";
import Link from "next/link";
import { APP_VERSION } from "@/lib/constants";

export default function Header() {
  return (
    <header className="glass sticky top-0 z-50 px-4 py-3">
      <nav className="mx-auto flex max-w-page-lg items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline" aria-label="Về trang chủ">
          <img
            src="/assets/icons/icon-192.svg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9"
          />
          <div className="hidden sm:block">
            <div className="text-base font-bold leading-tight text-red-700">
              SafeQR
            </div>
            <div className="text-[10px] leading-tight text-warm-500">
              QR Khẩn Cấp
            </div>
          </div>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1 sm:gap-2">
          <NavLink href="/handbook" label="📖" title="Sổ tay sơ cứu" />
          <NavLink href="/qr" label="📱" title="Tạo mã QR" />
          <NavLink href="/admin" label="🔐" title="Quản trị" />
          <span className="ml-1 hidden rounded-full bg-warm-200 px-2 py-0.5 text-[10px] font-medium text-warm-500 sm:inline-block">
            v{APP_VERSION}
          </span>
        </div>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  label,
  title,
}: {
  href: string;
  label: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      title={title}
      aria-label={title}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-warm-200/70 sm:w-auto sm:px-3 sm:text-sm sm:font-medium"
    >
      <span className="sm:hidden">{label}</span>
      <span className="hidden sm:inline">{title}</span>
    </Link>
  );
}
