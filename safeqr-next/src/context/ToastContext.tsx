// ============================================
// SafeQR v2 — Global Toast Context
// ============================================
import React, { createContext, useContext, useCallback, useRef, useState } from "react";
import type { ToastState } from "@/hooks/useToast";

interface ToastContextValue {
  toast: ToastState;
  showToast: (message: string, type?: "info" | "error") => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "info",
    visible: false,
    id: 0,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterRef = useRef(0);

  const showToast = useCallback(
    (message: string, type: "info" | "error" = "info") => {
      if (timerRef.current) clearTimeout(timerRef.current);

      counterRef.current += 1;
      setToast({ message, type, visible: true, id: counterRef.current });

      timerRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
    },
    []
  );

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return ctx;
}
