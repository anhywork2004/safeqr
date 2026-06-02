// ============================================
// SafeQR v2 — Auth Hook
// ============================================
import { useState, useCallback, useEffect } from "react";
import type { AdminSession, LoginCredentials } from "@/types";
import { DEFAULT_PASSWORDS } from "@/data/contacts";
import { loginAPI } from "@/lib/api";
import {
  saveToken,
  createSession,
  loadSession,
  clearSession,
  validateSession,
} from "@/lib/auth";

interface UseAuthReturn {
  session: AdminSession | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const existing = validateSession();
    if (existing) {
      setSession(existing);
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        // 1. Try API login
        const apiResp = await loginAPI(
          credentials.agencyId,
          credentials.password
        );

        if (apiResp?.token) {
          saveToken(apiResp.token);
          const sess = createSession(apiResp, true);
          setSession(sess);
          setLoading(false);
          return true;
        }

        // 2. Fallback local auth
        const expectedPwd =
          DEFAULT_PASSWORDS[credentials.agencyId as keyof typeof DEFAULT_PASSWORDS];

        if (expectedPwd && expectedPwd === credentials.password) {
          const mockResponse = {
            token: "",
            agencyId: credentials.agencyId,
            agencyName: getAgencyName(credentials.agencyId),
          };
          const sess = createSession(mockResponse, false);
          setSession(sess);
          setLoading(false);
          return true;
        }

        setError("Sai thông tin đăng nhập. Vui lòng thử lại.");
        setLoading(false);
        return false;
      } catch {
        setError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
        setLoading(false);
        return false;
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return { session, loading, error, login, logout };
}

function getAgencyName(agencyId: string): string {
  const names: Record<string, string> = {
    medical: "Cấp cứu y tế",
    fire: "Cảnh sát PCCC & CNCH",
    police: "Công an địa phương",
    electricity: "Điện lực",
    water: "Cấp nước",
    ward: "Đường dây nóng UBND phường",
  };
  return names[agencyId] || agencyId;
}
