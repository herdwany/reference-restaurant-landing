import { useCallback, useRef, useState } from "react";

export interface ToastMessage {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<number[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastMessage["type"] = "success") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((current) => [...current, { id, message, type }]);

      const timerId = window.setTimeout(() => {
        dismissToast(id);
      }, 3200);
      timers.current.push(timerId);
    },
    [dismissToast],
  );

  return { toasts, showToast, dismissToast };
}
