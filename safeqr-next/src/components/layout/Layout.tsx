// ============================================
// SafeQR v2 — Page Layout Wrapper
// ============================================
import React from "react";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
  hideFooter?: boolean;
  className?: string;
}

export default function Layout({
  children,
  hideHeader = false,
  hideFooter = false,
  className = "",
}: LayoutProps) {
  return (
    <>
      {!hideHeader && <Header />}
      <main className={`min-h-[60dvh] ${className}`}>{children}</main>
      {!hideFooter && <Footer />}
    </>
  );
}
