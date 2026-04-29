import { Loader2 } from "lucide-react";
import { useI18n } from "../../lib/i18n/I18nContext";

type AdminLoadingStateProps = {
  label?: string;
};

export default function AdminLoadingState({ label }: AdminLoadingStateProps) {
  const { t } = useI18n();

  return (
    <div className="admin-loading-state" aria-busy="true">
      <Loader2 className="admin-spin" size={28} aria-hidden="true" />
      <span>{label ?? t("loading")}</span>
    </div>
  );
}
