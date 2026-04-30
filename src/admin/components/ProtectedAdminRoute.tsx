import { AlertTriangle, Loader2, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import EmailVerificationGate from "../../components/EmailVerificationGate";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../lib/i18n/I18nContext";

type AdminStatusMessageProps = {
  actions?: ReactNode;
  title: string;
  body: string;
  isLoading?: boolean;
};

function AdminStatusMessage({ actions, title, body, isLoading = false }: AdminStatusMessageProps) {
  const { direction } = useI18n();
  const Icon = isLoading ? Loader2 : AlertTriangle;

  return (
    <main className={`admin-standalone dir-${direction}`} dir={direction}>
      <section className="admin-status-card" role={isLoading ? undefined : "alert"} aria-busy={isLoading}>
        <Icon className={isLoading ? "admin-spin" : undefined} aria-hidden="true" />
        <h1>{title}</h1>
        <p>{body}</p>
        {!isLoading && actions ? <div className="admin-session-actions">{actions}</div> : null}
      </section>
    </main>
  );
}

export default function ProtectedAdminRoute() {
  const { adminAccessIssue, currentUser, hasAdminAccess, isAuthConfigured, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const sessionActions = (
    <>
      <button className="admin-login-submit" type="button" onClick={() => void handleLogout()} disabled={isLoggingOut}>
        {isLoggingOut ? <Loader2 className="admin-spin" size={19} aria-hidden="true" /> : <LogOut size={19} aria-hidden="true" />}
        <span>{isLoggingOut ? t("loggingOut") : t("logoutAndLoginAgain")}</span>
      </button>
      <Link className="admin-icon-link" to="/login">
        {t("switchAccount")}
      </Link>
      <Link className="admin-back-link" to="/">
        {t("backToPublicSite")}
      </Link>
    </>
  );

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
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (currentUser && !currentUser.emailVerification) {
    return (
      <EmailVerificationGate
        backPath="/"
        onLogout={async () => {
          await logout();
          navigate("/login", { replace: true });
        }}
        onSwitchAccount={async () => {
          await logout();
          navigate("/login", { replace: true });
        }}
      />
    );
  }

  if (adminAccessIssue === "missing_profile") {
    return (
      <AdminStatusMessage
        title={t("profileMissing")}
        body={t("contactSupport")}
        actions={sessionActions}
      />
    );
  }

  if (adminAccessIssue === "inactive_profile") {
    return (
      <AdminStatusMessage
        title={t("accountInactive")}
        body={t("contactSupport")}
        actions={sessionActions}
      />
    );
  }

  if (adminAccessIssue === "unknown_role") {
    return <AdminStatusMessage title={t("accessDenied")} body={t("contactSupport")} actions={sessionActions} />;
  }

  if (adminAccessIssue === "missing_restaurant") {
    return <AdminStatusMessage title={t("restaurantScopeMissing")} body={t("contactSupport")} actions={sessionActions} />;
  }

  if (!hasAdminAccess) {
    return <AdminStatusMessage title={t("accessDenied")} body={t("contactSupport")} actions={sessionActions} />;
  }

  return <Outlet />;
}
