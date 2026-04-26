import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

type AdminErrorStateProps = {
  action?: ReactNode;
  message: string;
  title?: string;
};

export default function AdminErrorState({ action, message, title = "تعذر تحميل البيانات" }: AdminErrorStateProps) {
  return (
    <div className="admin-error-state" role="alert">
      <AlertTriangle size={24} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{message}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
