import { ArrowRight, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { mapKnownErrorToFriendlyMessage, normalizeUserFacingError } from "../lib/friendlyErrors";
import { useI18n } from "../lib/i18n/I18nContext";

type FieldErrors = {
  email?: string;
  password?: string;
};

type AdminLoginLocationState = {
  from?: {
    pathname?: string;
  };
};

export default function AdminLogin() {
  const { direction, t } = useI18n();
  const { errorMessage, isAuthConfigured, isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as AdminLoginLocationState | null;
  const redirectTo = locationState?.from?.pathname?.startsWith("/admin") ? locationState.from.pathname : "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/admin" replace />;
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
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(error);
      }
      setSubmitError(mapKnownErrorToFriendlyMessage(error, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={`admin-login-page dir-${direction}`} dir={direction}>
      <section className="admin-login-card" aria-busy={isSubmitting}>
        <div className="admin-login-card__icon">
          <ShieldCheck size={30} aria-hidden="true" />
        </div>
        <div className="admin-login-card__copy">
          <h1>{t("login")}</h1>
          <p>{t("adminLoginDescription")}</p>
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

        <Link className="admin-back-link" to="/">
          <ArrowRight size={18} aria-hidden="true" />
          <span>{t("backToSite")}</span>
        </Link>
      </section>
    </main>
  );
}
