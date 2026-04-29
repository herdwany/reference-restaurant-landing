import { AlertTriangle } from "lucide-react";
import { useI18n } from "../../lib/i18n/I18nContext";
import AdminActionButton from "./AdminActionButton";
import AdminFormModal from "./AdminFormModal";

type AdminConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function AdminConfirmDialog({
  cancelLabel,
  confirmLabel,
  isDanger = false,
  isOpen,
  isSubmitting = false,
  message,
  onCancel,
  onConfirm,
  title,
}: AdminConfirmDialogProps) {
  const { t } = useI18n();

  return (
    <AdminFormModal isOpen={isOpen} title={title} onClose={onCancel} size="sm">
      <div className="admin-confirm-dialog">
        <div className={`admin-confirm-dialog__icon${isDanger ? " admin-confirm-dialog__icon--danger" : ""}`}>
          <AlertTriangle size={24} aria-hidden="true" />
        </div>
        <p>{message}</p>
        <div className="admin-confirm-dialog__actions">
          <AdminActionButton variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel ?? t("cancel")}
          </AdminActionButton>
          <AdminActionButton variant={isDanger ? "danger" : "primary"} onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? t("saving") : confirmLabel}
          </AdminActionButton>
        </div>
      </div>
    </AdminFormModal>
  );
}
