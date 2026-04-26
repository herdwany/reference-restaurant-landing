import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  actions?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

export default function AdminPageHeader({ actions, description, eyebrow, title }: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header">
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions ? <div className="admin-page-header__actions">{actions}</div> : null}
    </header>
  );
}
