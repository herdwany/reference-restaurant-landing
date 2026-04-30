import { Loader2, LogOut, MailCheck, RefreshCw } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { mapKnownErrorToFriendlyMessage } from "../lib/friendlyErrors";
import { useI18n } from "../lib/i18n/I18nContext";
import { buildAppUrl, sendVerificationEmail } from "../services/authService";

type EmailVerificationGateProps = {
  backPath?: string;
  brandName?: string;
  cardClassName?: string;
  loginPath?: string;
  logoUrl?: string;
  onLogout?: () => Promise<void>;
  pageClassName?: string;
  restaurantSlug?: string;
  style?: CSSProperties;
};

export default function EmailVerificationGate({
  backPath = "/",
  brandName,
  cardClassName = "admin-login-card",
  loginPath = "/login",
  logoUrl,
  onLogout,
  pageClassName = "admin-login-page",
  restaurantSlug,
  style,
}: EmailVerificationGateProps) {
  const { direction, t } = useI18n();
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const resendVerification = async () => {
    setIsResending(true);
    setNotice(null);
    setErrorMessage(null);

    try {
      await sendVerificationEmail(buildAppUrl("/verify-email", { restaurantSlug }));
      setNotice(t("verificationEmailSent"));
    } catch (error) {
      setErrorMessage(mapKnownErrorToFriendlyMessage(error, t));
    } finally {
      setIsResending(false);
    }
  };

  const logout = async () => {
    if (!onLogout) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <main className={`${pageClassName} dir-${direction}`} dir={direction} style={style}>
      <section className={cardClassName} aria-busy={isResending || isLoggingOut}>
        {logoUrl ? (
          <img className="admin-login-card__brand-logo" src={logoUrl} alt={brandName || t("restaurantFallbackName")} />
        ) : (
          <div className="admin-login-card__icon">
            <MailCheck size={30} aria-hidden="true" />
          </div>
        )}
        <div className="admin-login-card__copy">
          {brandName ? <span className="admin-login-card__eyebrow">{brandName}</span> : null}
          <h1>{t("verifyEmail")}</h1>
          <p>{t("emailVerificationRequired")}</p>
        </div>

        {notice ? <div className="admin-form-note">{notice}</div> : null}
        {errorMessage ? <div className="admin-form-alert" role="alert">{errorMessage}</div> : null}

        <div className="admin-session-actions">
          <button className="admin-login-submit" type="button" onClick={() => void resendVerification()} disabled={isResending}>
            {isResending ? <Loader2 className="admin-spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
            <span>{t("resendVerificationEmail")}</span>
          </button>
          {onLogout ? (
            <button className="admin-icon-link" type="button" onClick={() => void logout()} disabled={isLoggingOut}>
              {isLoggingOut ? <Loader2 className="admin-spin" size={18} aria-hidden="true" /> : <LogOut size={18} aria-hidden="true" />}
              <span>{isLoggingOut ? t("loggingOut") : t("logout")}</span>
            </button>
          ) : (
            <Link className="admin-icon-link" to={loginPath}>
              {t("login")}
            </Link>
          )}
          <Link className="admin-back-link" to={backPath}>
            {t("backToPublicSite")}
          </Link>
        </div>
      </section>
    </main>
  );
}
