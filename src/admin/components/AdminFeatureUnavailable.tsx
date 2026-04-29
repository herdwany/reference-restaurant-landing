import { LockKeyhole } from "lucide-react";
import { useI18n } from "../../lib/i18n/I18nContext";
import AdminErrorState from "./AdminErrorState";

type AdminFeatureUnavailableProps = {
  featureName: string;
};

export default function AdminFeatureUnavailable({ featureName }: AdminFeatureUnavailableProps) {
  const { t } = useI18n();

  return (
    <AdminErrorState
      title={featureName ? `${t("featureUnavailable")} ${featureName}` : t("featureUnavailable")}
      message={t("planRestrictionMessage")}
      action={<LockKeyhole size={18} aria-hidden="true" />}
    />
  );
}
