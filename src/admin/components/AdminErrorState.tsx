import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "../../lib/i18n/I18nContext";

type AdminErrorStateProps = {
  action?: ReactNode;
  message: string;
  title?: string;
};

export default function AdminErrorState({ action, message, title }: AdminErrorStateProps) {
  const { t } = useI18n();

  return (
    <div className="admin-error-state" role="alert">
      <AlertTriangle size={24} aria-hidden="true" />
      <h2>{title ?? t("operationFailed")}</h2>
      <p>{message}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
