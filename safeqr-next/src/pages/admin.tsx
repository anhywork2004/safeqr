// ============================================
// SafeQR v2 — Admin Login Page
// ============================================
import React, { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "@/components/layout/Layout";
import LoginForm from "@/components/admin/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/context/ToastContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { session, loading, error, login } = useAuth();
  const { showToast } = useToastContext();

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      router.replace("/admin/dashboard");
    }
  }, [session, router]);

  const handleLogin = async (credentials: {
    agencyId: string;
    password: string;
  }) => {
    const ok = await login(credentials);
    if (ok) {
      showToast("Đăng nhập thành công!", "info");
      router.push("/admin/dashboard");
    }
    return ok;
  };

  return (
    <>
      <Head>
        <title>Quản trị — SafeQR</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <Layout>
        <div className="mx-auto max-w-page-lg px-4 py-16">
          {/* Back link */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-warm-500 transition-colors hover:text-warm-700"
          >
            ← Về trang chủ
          </Link>

          <LoginForm onSubmit={handleLogin} loading={loading} error={error} />
        </div>
      </Layout>
    </>
  );
}
