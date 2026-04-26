import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  closeLabel: string;
}

export default function Modal({
  isOpen,
  title,
  onClose,
  children,
  size = "md",
  closeLabel,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

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
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`modal__content modal__content--${size}`} ref={contentRef}>
        <button className="icon-button modal__close" type="button" onClick={onClose} aria-label={closeLabel}>
          <X size={20} />
        </button>
        {title ? <h3 className="modal__title">{title}</h3> : null}
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
