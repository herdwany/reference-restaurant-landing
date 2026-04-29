import { AlertTriangle, Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../lib/i18n/I18nContext";

type AdminStatusMessageProps = {
  title: string;
  body: string;
  isLoading?: boolean;
};

function AdminStatusMessage({ title, body, isLoading = false }: AdminStatusMessageProps) {
  const { direction } = useI18n();
  const Icon = isLoading ? Loader2 : AlertTriangle;

  return (
    <main className={`admin-standalone dir-${direction}`} dir={direction}>
      <section className="admin-status-card" role={isLoading ? undefined : "alert"} aria-busy={isLoading}>
        <Icon className={isLoading ? "admin-spin" : undefined} aria-hidden="true" />
        <h1>{title}</h1>
        <p>{body}</p>
      </section>
    </main>
  );
}

export default function ProtectedAdminRoute() {
  const { adminAccessIssue, hasAdminAccess, isAuthConfigured, isAuthenticated, isLoading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (!isAuthConfigured) {
    return (
      <AdminStatusMessage
        title={t("appwriteSetupRequired")}
        body={t("contactSupport")}
      />
    );
  }

  if (isLoading) {
    return (
      <AdminStatusMessage
        title={t("loading")}
        body={t("loading")}
        isLoading
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (adminAccessIssue === "missing_profile") {
    return (
      <AdminStatusMessage
        title={t("profileMissing")}
        body={t("contactSupport")}
      />
    );
  }

  if (adminAccessIssue === "inactive_profile") {
    return (
      <AdminStatusMessage
        title={t("accountInactive")}
        body={t("contactSupport")}
      />
    );
  }

  if (adminAccessIssue === "unknown_role") {
    return <AdminStatusMessage title={t("accessDenied")} body={t("contactSupport")} />;
  }

  if (adminAccessIssue === "missing_restaurant") {
    return <AdminStatusMessage title={t("restaurantScopeMissing")} body={t("contactSupport")} />;
  }

  if (!hasAdminAccess) {
    return <AdminStatusMessage title={t("accessDenied")} body={t("contactSupport")} />;
  }

  return <Outlet />;
}
