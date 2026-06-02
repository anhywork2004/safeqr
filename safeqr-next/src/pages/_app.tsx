// ============================================
// SafeQR v2 — App Wrapper
// ============================================
import type { AppProps } from "next/app";
import Head from "next/head";
import { ToastProvider } from "@/context/ToastContext";
import Toast from "@/components/ui/Toast";
import { usePWA } from "@/hooks/usePWA";
import "@/styles/globals.css";

export default function SafeQRApp({ Component, pageProps }: AppProps) {
  usePWA();

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />
        <meta name="theme-color" content="#b71c1c" />
        <meta name="color-scheme" content="light" />
        <meta
          name="description"
          content="QR Khẩn Cấp — Tra cứu số điện thoại khẩn cấp nhanh chóng. Một chạm để gọi cứu hộ, cứu hỏa, công an."
        />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.google.com; connect-src 'self' https://*.google.com; font-src 'self' https://fonts.gstatic.com;"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/assets/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/assets/icons/icon-192.svg" />
      </Head>

      <ToastProvider>
        <Component {...pageProps} />
        <Toast />
      </ToastProvider>
    </>
  );
}
