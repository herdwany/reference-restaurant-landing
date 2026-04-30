import { AlertTriangle, ArrowRight, Loader2, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { mapKnownErrorToFriendlyMessage, normalizeUserFacingError } from "../lib/friendlyErrors";
import { useI18n } from "../lib/i18n/I18nContext";
import type { Profile } from "../types/platform";

type FieldErrors = {
  email?: string;
  password?: string;
};

type AdminLoginProps = {
  customerRedirectPath?: string;
  publicBackPath?: string;
};

const getProfileDashboardPath = (profile: Profile | null) => {
  if (!profile?.isActive) {
    return null;
  }

  if (profile.role === "agency_admin") {
    return "/agency";
  }

  if ((profile.role === "owner" || profile.role === "staff") && profile.restaurantId) {
    return "/admin";
  }

  return null;
};

const isAdminProfileRole = (profile: Profile | null) =>
  profile?.role === "agency_admin" || profile?.role === "owner" || profile?.role === "staff";

export default function AdminLogin({ customerRedirectPath, publicBackPath = "/" }: AdminLoginProps = {}) {
  const { direction, t } = useI18n();
  const {
    adminAccessIssue,
    errorMessage,
    hasAdminAccess,
    isAgencyAdmin,
    isAuthConfigured,
    isAuthenticated,
    isLoading,
    isOwner,
    isStaff,
    login,
    logout,
    profile,
    restaurantId,
  } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const authenticatedDashboardPath = isAgencyAdmin ? "/agency" : (isOwner || isStaff) && restaurantId ? "/admin" : null;
  const hasBlockedSession = !isLoading && isAuthenticated && !authenticatedDashboardPath;
  const isAccountNotReady = Boolean(hasBlockedSession && profile && !adminAccessIssue && !hasAdminAccess);

  if (!isLoading && isAuthenticated && authenticatedDashboardPath) {
    return <Navigate to={authenticatedDashboardPath} replace />;
  }

  if (!isLoading && isAuthenticated && customerRedirectPath && !profile && adminAccessIssue === "missing_profile") {
    return <Navigate to={customerRedirectPath} replace />;
  }

  const validate = () => {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = t("emailRequired");
    }

    if (!password) {
      errors.password = t("passwordRequired");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    if (!isAuthConfigured) {
      setSubmitError(t("appwriteSetupRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const loadedProfile = await login(email.trim(), password);
      const dashboardPath = getProfileDashboardPath(loadedProfile);

      if (dashboardPath) {
        navigate(dashboardPath, { replace: true });
      } else if (customerRedirectPath && !isAdminProfileRole(loadedProfile)) {
        navigate(customerRedirectPath, { replace: true });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(error);
      }
      setSubmitError(mapKnownErrorToFriendlyMessage(error, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async (nextPath: string) => {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate(nextPath, { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getSessionIssueMessage = () => {
    if (isAccountNotReady) {
      return t("currentSessionHasIssue");
    }

    if (adminAccessIssue === "missing_profile") {
      return t("profileMissing");
    }

    if (adminAccessIssue === "inactive_profile") {
      return t("accountInactive");
    }

    if (adminAccessIssue === "missing_restaurant") {
      return t("restaurantScopeMissing");
    }

    if (adminAccessIssue === "unknown_role") {
      return t("accessDenied");
    }

    return t("currentSessionHasIssue");
  };

  if (hasBlockedSession) {
    return (
      <main className={`admin-login-page dir-${direction}`} dir={direction}>
        <section className="admin-login-card" aria-busy={isLoggingOut}>
          <div className="admin-login-card__icon">
            <AlertTriangle size={30} aria-hidden="true" />
          </div>
          <div className="admin-login-card__copy">
            <h1>{isAccountNotReady ? t("accountNotReady") : t("currentSessionHasIssue")}</h1>
            <p>{getSessionIssueMessage()}</p>
          </div>
          <div className="admin-session-actions">
            <button
              className="admin-login-submit"
              type="button"
              onClick={() => void handleLogout(publicBackPath)}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? <Loader2 className="admin-spin" size={19} aria-hidden="true" /> : <LogOut size={19} aria-hidden="true" />}
              <span>{isLoggingOut ? t("loggingOut") : t("logout")}</span>
            </button>
            <button
              className="admin-icon-link"
              type="button"
              onClick={() => void handleLogout("/login")}
              disabled={isLoggingOut}
            >
              {t("switchAccount")}
            </button>
            <Link className="admin-back-link" to={publicBackPath}>
              <ArrowRight size={18} aria-hidden="true" />
              <span>{t("backToPublicSite")}</span>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`admin-login-page dir-${direction}`} dir={direction}>
      <section className="admin-login-card" aria-busy={isSubmitting}>
        <div className="admin-login-card__icon">
          <ShieldCheck size={30} aria-hidden="true" />
        </div>
        <div className="admin-login-card__copy">
          <h1>{t("accountLogin")}</h1>
          <p>{t("loginBody")}</p>
        </div>

        {!isAuthConfigured ? <div className="admin-form-alert">{t("appwriteSetupRequired")}</div> : null}
        {submitError ? <div className="admin-form-alert" role="alert">{submitError}</div> : null}
        {errorMessage && isAuthConfigured ? <div className="admin-form-note">{normalizeUserFacingError(errorMessage, t)}</div> : null}

        <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
          <label>
            <span>{t("email")}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
              placeholder="owner@example.com"
            />
            {fieldErrors.email ? <small>{fieldErrors.email}</small> : null}
          </label>

          <label>
            <span>{t("password")}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              autoComplete="current-password"
              placeholder="********"
            />
            {fieldErrors.password ? <small>{fieldErrors.password}</small> : null}
          </label>

          <button className="admin-login-submit" type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? <Loader2 className="admin-spin" size={19} aria-hidden="true" /> : <LogIn size={19} aria-hidden="true" />}
            <span>{isSubmitting ? t("loggingIn") : t("loginButton")}</span>
          </button>
        </form>

        <Link className="admin-back-link" to={publicBackPath}>
          <ArrowRight size={18} aria-hidden="true" />
          <span>{t("backToPublicSite")}</span>
        </Link>
      </section>
    </main>
  );
}
