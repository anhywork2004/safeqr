// ============================================
// SafeQR v2 — Toast Notification Hook
// ============================================
import { useState, useCallback, useRef } from "react";

export interface ToastState {
  message: string;
  type: "info" | "error";
  visible: boolean;
  id: number;
}

export function useToast(durationMs: number = 3000) {
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
      }, durationMs);
    },
    [durationMs]
  );

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return { toast, showToast, hideToast };
}
