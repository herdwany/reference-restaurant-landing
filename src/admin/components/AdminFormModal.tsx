import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useI18n } from "../../lib/i18n/I18nContext";

type AdminFormModalProps = {
  children: ReactNode;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
  title: string;
};

export default function AdminFormModal({
  children,
  description,
  isOpen,
  onClose,
  size = "md",
  title,
}: AdminFormModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.classList.add("body-lock");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("body-lock");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="admin-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className={`admin-modal__panel admin-modal__panel--${size}`}>
        <div className="admin-modal__header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="admin-modal__close" type="button" aria-label={t("close")} onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="admin-modal__body">{children}</div>
      </section>
    </div>
  );
}
