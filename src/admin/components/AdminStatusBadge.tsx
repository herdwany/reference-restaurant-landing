import type { ReactNode } from "react";

type AdminStatusBadgeTone = "success" | "warning" | "neutral" | "danger";

type AdminStatusBadgeProps = {
  children: ReactNode;
  tone?: AdminStatusBadgeTone;
};

export default function AdminStatusBadge({ children, tone = "neutral" }: AdminStatusBadgeProps) {
  return <span className={`admin-status-badge admin-status-badge--${tone}`}>{children}</span>;
}
