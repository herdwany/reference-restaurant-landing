import { Loader2 } from "lucide-react";

type AdminLoadingStateProps = {
  label?: string;
};

export default function AdminLoadingState({ label = "جارٍ تحميل البيانات..." }: AdminLoadingStateProps) {
  return (
    <div className="admin-loading-state" aria-busy="true">
      <Loader2 className="admin-spin" size={28} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
