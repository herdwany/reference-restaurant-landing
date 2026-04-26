import type { ReactNode } from "react";

type AdminEmptyStateProps = {
  action?: ReactNode;
  body: string;
  icon?: ReactNode;
  title: string;
};

export default function AdminEmptyState({ action, body, icon, title }: AdminEmptyStateProps) {
  return (
    <div className="admin-empty-state">
      {icon ? <div className="admin-empty-state__icon">{icon}</div> : null}
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? <div className="admin-empty-state__action">{action}</div> : null}
    </div>
  );
}
