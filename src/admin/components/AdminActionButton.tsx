import type { ButtonHTMLAttributes, ReactNode } from "react";

type AdminActionButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type AdminActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: AdminActionButtonVariant;
};

export default function AdminActionButton({
  children,
  className = "",
  icon,
  type = "button",
  variant = "secondary",
  ...props
}: AdminActionButtonProps) {
  return (
    <button className={`admin-action-button admin-action-button--${variant} ${className}`.trim()} type={type} {...props}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
