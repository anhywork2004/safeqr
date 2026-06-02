// ============================================
// SafeQR v2 — PWA Service Worker Registration Hook
// ============================================
import { useEffect } from "react";

export function usePWA(): void {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[SafeQR PWA] Service Worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[SafeQR PWA] SW registration failed:", err.message);
      });
  }, []);
}
