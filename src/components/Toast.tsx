import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { ToastMessage } from "../hooks/useToast";
import { useI18n } from "../lib/i18n/I18nContext";

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const iconByType = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export default function Toast({ toasts, onDismiss }: ToastProps) {
  const { t } = useI18n();

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const Icon = iconByType[toast.type ?? "success"];
        return (
          <div className={`toast toast--${toast.type ?? "success"}`} key={toast.id}>
            <Icon size={20} />
            <span>{toast.message}</span>
            <button type="button" onClick={() => onDismiss(toast.id)} aria-label={t("closeAlert")}>
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
