import { AlertTriangle, ArrowRight, Chrome, Loader2, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import EmailVerificationGate from "../components/EmailVerificationGate";
import { useAuth } from "../context/AuthContext";
import { mapKnownErrorToFriendlyMessage, normalizeUserFacingError } from "../lib/friendlyErrors";
import { useI18n } from "../lib/i18n/I18nContext";
import { getPublicThemeClassNames, getPublicThemeStyle } from "../lib/publicTheme";
import {
  AuthServiceError,
  buildAppUrl,
  loginWithOAuthProvider,
  registerWithEmail,
  resetPassword,
  sendPasswordRecoveryEmail,
  sendVerificationEmail,
  type OAuthLoginProvider,
} from "../services/authService";
import { upsertCustomerProfile } from "../services/repositories/customerProfileRepository";
import { getSiteDataBySlug, type SiteDataResult } from "../services/siteDataService";
import type { Profile } from "../types/platform";

type AuthMode = "forgot" | "login" | "register" | "reset";

type FieldErrors = {
  confirmPassword?: string;
  email?: string;
  fullName?: string;
  password?: string;
  phone?: string;
};

type AdminLoginProps = {
  allowCustomerRegistration?: boolean;
  authMode?: AuthMode;
  customerLoginPath?: string;
  customerForgotPasswordPath?: string;
  customerRegisterPath?: string;
  customerRedirectPath?: string;
  publicBackPath?: string;
  restaurantSlug?: string;
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

const getIconType = (href: string) => {
  if (href.toLowerCase().includes(".webp")) {
    return "image/webp";
  }

  if (href.toLowerCase().includes(".png")) {
    return "image/png";
  }

  return "image/svg+xml";
};

const updateIconLink = (rel: "apple-touch-icon" | "icon", href: string) => {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }

  link.href = href;

  if (rel === "icon") {
    link.type = getIconType(href);
  }
};

export default function AdminLogin({
  allowCustomerRegistration = false,
  authMode = "login",
  customerForgotPasswordPath,
  customerLoginPath,
  customerRegisterPath,
  customerRedirectPath,
  publicBackPath = "/",
  restaurantSlug,
}: AdminLoginProps = {}) {
  const { direction, t } = useI18n();
  const {
    adminAccessIssue,
    currentUser,
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
    refreshUser,
    restaurantId: adminRestaurantId,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRegisterMode = allowCustomerRegistration && authMode === "register";
  const isForgotMode = authMode === "forgot";
  const isResetMode = authMode === "reset";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [defaultAddress, setDefaultAddress] = useState("");
  const [city, setCity] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [customerRestaurantId, setCustomerRestaurantId] = useState("");
  const [authSiteData, setAuthSiteData] = useState<SiteDataResult | null>(null);
  const [isSiteLoading, setIsSiteLoading] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const authenticatedDashboardPath =
    isAgencyAdmin ? "/agency" : (isOwner || isStaff) && adminRestaurantId ? "/admin" : null;
  const hasBlockedSession = !isLoading && isAuthenticated && !authenticatedDashboardPath;
  const isAccountNotReady = Boolean(hasBlockedSession && profile && !adminAccessIssue && !hasAdminAccess);

  useEffect(() => {
    if (!restaurantSlug) {
      setCustomerRestaurantId("");
      setAuthSiteData(null);
      setSiteError(null);
      setIsSiteLoading(false);
      return;
    }

    let isMounted = true;

    const loadSite = async () => {
      setIsSiteLoading(true);
      setSiteError(null);

      try {
        const result = await getSiteDataBySlug(restaurantSlug);

        if (!isMounted) {
          return;
        }

        if (result.isNotFound) {
          setSiteError(t("notFound"));
          setCustomerRestaurantId("");
          setAuthSiteData(null);
          return;
        }

        setAuthSiteData(result);
        setCustomerRestaurantId(result.config.restaurant.id ?? "");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSiteError(mapKnownErrorToFriendlyMessage(error, t));
        setCustomerRestaurantId("");
        setAuthSiteData(null);
      } finally {
        if (isMounted) {
          setIsSiteLoading(false);
        }
      }
    };

    void loadSite();

    return () => {
      isMounted = false;
    };
  }, [restaurantSlug, t]);

  useEffect(() => {
    if (!authSiteData) {
      return undefined;
    }

    const previousTitle = document.title;
    const previousIcon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href;
    const previousAppleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')?.href;
    const restaurantName = authSiteData.config.restaurant.name?.trim();
    const faviconHref = authSiteData.config.restaurant.faviconImage;

    if (restaurantName) {
      document.title = `${restaurantName} | ${t("accountLogin")}`;
    }

    if (faviconHref) {
      updateIconLink("icon", faviconHref);
      updateIconLink("apple-touch-icon", faviconHref);
    }

    return () => {
      document.title = previousTitle;

      if (previousIcon) {
        updateIconLink("icon", previousIcon);
      }

      if (previousAppleIcon) {
        updateIconLink("apple-touch-icon", previousAppleIcon);
      }
    };
  }, [authSiteData, t]);

  const authPageClassName = useMemo(() => {
    if (!authSiteData) {
      return "admin-login-page";
    }

    const backgroundStyle = authSiteData.config.settings.backgroundStyle || "warm";
    const buttonStyle = authSiteData.config.settings.buttonStyle || "rounded";

    return `${getPublicThemeClassNames(authSiteData.config, "admin-login-page auth-page--branded")} auth-page--background-${backgroundStyle} auth-page--button-${buttonStyle}`;
  }, [authSiteData]);
  const authPageStyle = authSiteData ? getPublicThemeStyle(authSiteData.config) : undefined;
  const authBrandName = authSiteData?.config.restaurant.name;
  const authLogoUrl = authSiteData?.config.restaurant.logoImage;
  const forgotPasswordPath = customerForgotPasswordPath || "/forgot-password";
  const resetPasswordPath = restaurantSlug ? `/r/${restaurantSlug}/account/reset-password` : "/reset-password";
  const switchAccountPath = customerLoginPath || "/login";
  const oauthFailurePath = restaurantSlug ? `${customerLoginPath || `/r/${restaurantSlug}/account/login`}?oauth=failed` : "/login?oauth=failed";
  const requiresEmailVerification = Boolean(!isLoading && currentUser && !currentUser.emailVerification);

  if (requiresEmailVerification) {
    return (
      <EmailVerificationGate
        backPath={publicBackPath}
        brandName={authBrandName}
        logoUrl={authLogoUrl}
        onLogout={async () => {
          await logout();
          navigate(publicBackPath, { replace: true });
        }}
        onSwitchAccount={async () => {
          await logout();
          navigate(switchAccountPath, { replace: true });
        }}
        pageClassName={authPageClassName}
        restaurantSlug={restaurantSlug}
        style={authPageStyle}
      />
    );
  }

  if (!isLoading && isAuthenticated && authenticatedDashboardPath) {
    return <Navigate to={authenticatedDashboardPath} replace />;
  }

  if (!isLoading && isAuthenticated && customerRedirectPath && !profile && adminAccessIssue === "missing_profile") {
    return <Navigate to={customerRedirectPath} replace />;
  }

  const validateLogin = () => {
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

  const validateForgotPassword = () => {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = t("emailRequired");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateResetPassword = () => {
    const errors: FieldErrors = {};

    if (!password) {
      errors.password = t("passwordRequired");
    }

    if (!confirmPassword) {
      errors.confirmPassword = t("requiredField");
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t("passwordsDoNotMatch");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateRegister = () => {
    const errors: FieldErrors = {};

    if (!fullName.trim()) {
      errors.fullName = t("requiredField");
    }

    if (!phone.trim()) {
      errors.phone = t("requiredField");
    }

    if (!email.trim()) {
      errors.email = t("emailRequired");
    }

    if (!password) {
      errors.password = t("passwordRequired");
    }

    if (!confirmPassword) {
      errors.confirmPassword = t("requiredField");
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t("passwordsDoNotMatch");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validate = () => {
    if (isRegisterMode) {
      return validateRegister();
    }

    if (isForgotMode) {
      return validateForgotPassword();
    }

    if (isResetMode) {
      return validateResetPassword();
    }

    return validateLogin();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitNotice(null);

    if (!validate()) {
      return;
    }

    if (!isAuthConfigured) {
      setSubmitError(t("appwriteSetupRequired"));
      return;
    }

    if (isForgotMode) {
      setIsSubmitting(true);

      try {
        await sendPasswordRecoveryEmail(
          email.trim(),
          buildAppUrl(resetPasswordPath, { restaurantSlug }),
        );
        setSubmitNotice(t("recoveryEmailSent"));
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(error);
        }

        setSubmitError(mapKnownErrorToFriendlyMessage(error, t));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (isResetMode) {
      const userId = searchParams.get("userId")?.trim() || "";
      const secret = searchParams.get("secret")?.trim() || "";

      if (!userId || !secret) {
        setSubmitError(t("linkExpiredOrInvalid"));
        return;
      }

      setIsSubmitting(true);

      try {
        await resetPassword(userId, secret, password);
        setSubmitNotice(t("savedSuccessfully"));
        setPassword("");
        setConfirmPassword("");
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(error);
        }

        setSubmitError(mapKnownErrorToFriendlyMessage(error, t));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (isRegisterMode) {
      if (isSiteLoading) {
        setSubmitError(t("loadingSite"));
        return;
      }

      if (!customerRestaurantId) {
        setSubmitError(siteError ?? t("restaurantScopeMissing"));
        return;
      }

      setIsSubmitting(true);

      try {
        const normalizedEmail = email.trim();
        const normalizedName = fullName.trim();
        const normalizedPhone = phone.trim();
        const normalizedAddress = defaultAddress.trim();
        const normalizedCity = city.trim();
        const normalizedNotes = deliveryNotes.trim();

        const createdUser = await registerWithEmail(normalizedEmail, password, normalizedName);
        await upsertCustomerProfile({
          restaurantId: customerRestaurantId,
          userId: createdUser.$id,
          fullName: normalizedName,
          phone: normalizedPhone,
          email: normalizedEmail,
          defaultAddress: normalizedAddress ? normalizedAddress : undefined,
          city: normalizedCity ? normalizedCity : undefined,
          deliveryNotes: normalizedNotes ? normalizedNotes : undefined,
        });

        await refreshUser();
        await sendVerificationEmail(buildAppUrl("/verify-email", { restaurantSlug }));
        setSubmitNotice(t("verificationEmailSent"));
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(error);
        }

        if (error instanceof AuthServiceError && error.code === "EMAIL_ALREADY_USED") {
          setSubmitError(t("emailAlreadyUsed"));
          return;
        }

        setSubmitError(mapKnownErrorToFriendlyMessage(error, t));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    setIsSubmitting(true);

    try {
      const { profile: loadedProfile, user } = await login(email.trim(), password);

      if (!user.emailVerification) {
        setSubmitError(t("emailVerificationRequired"));
        return;
      }

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

  const handleOAuthLogin = (provider: OAuthLoginProvider) => {
    setSubmitError(null);
    setSubmitNotice(null);

    if (!isAuthConfigured) {
      setSubmitError(t("appwriteSetupRequired"));
      return;
    }

    try {
      loginWithOAuthProvider(
        provider,
        buildAppUrl("/oauth/callback", { restaurantSlug }),
        buildAppUrl(oauthFailurePath),
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(error);
      }

      setSubmitError(mapKnownErrorToFriendlyMessage(error, t));
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

  const authTitle = isRegisterMode
    ? t("createAccount")
    : isForgotMode
      ? t("forgotPassword")
      : isResetMode
        ? t("resetPassword")
        : t("accountLogin");
  const authDescription = isRegisterMode
    ? t("customerSignupDescription")
    : isForgotMode
      ? t("checkYourEmail")
      : isResetMode
        ? t("newPassword")
        : t("loginBody");
  const submitLabel = isRegisterMode
    ? t("createAccount")
    : isForgotMode
      ? t("sendRecoveryEmail")
      : isResetMode
        ? t("resetPassword")
        : t("loginButton");
  const submittingLabel = isRegisterMode || isResetMode || isForgotMode ? t("saving") : t("loggingIn");
  const passwordAutoComplete = isRegisterMode || isResetMode ? "new-password" : "current-password";
  const emailPlaceholder = customerRedirectPath ? "name@example.com" : "owner@example.com";
  const isResetLinkMissing = isResetMode && (!searchParams.get("userId")?.trim() || !searchParams.get("secret")?.trim());
  const isSubmitDisabled = isSubmitting || isLoading || isResetLinkMissing || (isRegisterMode && isSiteLoading);

  if (hasBlockedSession) {
    return (
      <main className={`${authPageClassName} dir-${direction}`} dir={direction} style={authPageStyle}>
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
              onClick={() => void handleLogout(switchAccountPath)}
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
    <main className={`${authPageClassName} dir-${direction}`} dir={direction} style={authPageStyle}>
      <section className="admin-login-card" aria-busy={isSubmitting}>
        {authLogoUrl ? (
          <img className="admin-login-card__brand-logo" src={authLogoUrl} alt={authBrandName || t("restaurantFallbackName")} />
        ) : authBrandName ? (
          <div className="admin-login-card__brand-text">{authBrandName}</div>
        ) : (
          <div className="admin-login-card__icon">
            <ShieldCheck size={30} aria-hidden="true" />
          </div>
        )}
        <div className="admin-login-card__copy">
          {!authBrandName ? <span className="admin-login-card__eyebrow">Pixel One</span> : null}
          <h1>{authTitle}</h1>
          <p>{authDescription}</p>
        </div>

        {!isAuthConfigured ? <div className="admin-form-alert">{t("appwriteSetupRequired")}</div> : null}
        {restaurantSlug && siteError ? <div className="admin-form-alert">{siteError}</div> : null}
        {submitError ? <div className="admin-form-alert" role="alert">{submitError}</div> : null}
        {isResetLinkMissing ? <div className="admin-form-alert" role="alert">{t("linkExpiredOrInvalid")}</div> : null}
        {submitNotice ? <div className="admin-form-note">{submitNotice}</div> : null}
        {searchParams.get("oauth") === "failed" ? <div className="admin-form-alert" role="alert">{t("loginFailed")}</div> : null}
        {errorMessage && isAuthConfigured ? <div className="admin-form-note">{normalizeUserFacingError(errorMessage, t)}</div> : null}

        {!isForgotMode && !isResetMode ? (
          <div className="admin-oauth">
            <button className="admin-oauth-button" type="button" onClick={() => handleOAuthLogin("google")} disabled={isSubmitting || isLoading}>
              <Chrome size={18} aria-hidden="true" />
              <span>{t("continueWithGoogle")}</span>
            </button>
            <div className="admin-auth-divider">
              <span>{t("orContinueWithEmail")}</span>
            </div>
          </div>
        ) : null}

        <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
          {isRegisterMode ? (
            <>
              <label>
                <span>{t("accountName")}</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  autoComplete="name"
                  required
                />
                {fieldErrors.fullName ? <small>{fieldErrors.fullName}</small> : null}
              </label>

              <label>
                <span>{t("phone")}</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
                {fieldErrors.phone ? <small>{fieldErrors.phone}</small> : null}
              </label>
            </>
          ) : null}

          {!isResetMode ? (
            <label>
              <span>{t("email")}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                autoComplete="email"
                placeholder={emailPlaceholder}
                required
              />
              {fieldErrors.email ? <small>{fieldErrors.email}</small> : null}
            </label>
          ) : null}

          {!isForgotMode ? (
            <label>
              <span>{isResetMode ? t("newPassword") : t("password")}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                autoComplete={passwordAutoComplete}
                placeholder="********"
                required
              />
              {fieldErrors.password ? <small>{fieldErrors.password}</small> : null}
            </label>
          ) : null}

          {isRegisterMode || isResetMode ? (
            <>
              <label>
                <span>{isResetMode ? t("confirmNewPassword") : t("confirmPassword")}</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  autoComplete="new-password"
                  placeholder="********"
                  required
                />
                {fieldErrors.confirmPassword ? <small>{fieldErrors.confirmPassword}</small> : null}
              </label>

              {isRegisterMode ? (
                <>
              <label>
                <span>{t("defaultAddress")}</span>
                <input
                  value={defaultAddress}
                  onChange={(event) => setDefaultAddress(event.target.value)}
                  autoComplete="street-address"
                />
              </label>

              <label>
                <span>{t("city")}</span>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  autoComplete="address-level2"
                />
              </label>

              <label>
                <span>{t("deliveryNotes")}</span>
                <textarea
                  value={deliveryNotes}
                  onChange={(event) => setDeliveryNotes(event.target.value)}
                  rows={3}
                />
              </label>
                </>
              ) : null}
            </>
          ) : null}

          <button className="admin-login-submit" type="submit" disabled={isSubmitDisabled}>
            {isSubmitting ? <Loader2 className="admin-spin" size={19} aria-hidden="true" /> : <LogIn size={19} aria-hidden="true" />}
            <span>{isSubmitting ? submittingLabel : submitLabel}</span>
          </button>
        </form>

        {!isRegisterMode && !isForgotMode && !isResetMode ? (
          <div className="admin-auth-switch admin-auth-switch--single">
            <Link className="admin-icon-link" to={forgotPasswordPath}>
              {t("forgotPassword")}
            </Link>
          </div>
        ) : null}

        {isForgotMode || isResetMode ? (
          <div className="admin-auth-switch admin-auth-switch--single">
            <Link className="admin-icon-link" to={customerLoginPath || "/login"}>
              {t("login")}
            </Link>
          </div>
        ) : null}

        {allowCustomerRegistration && customerLoginPath && customerRegisterPath ? (
          <div className="admin-auth-switch">
            <span>{isRegisterMode ? t("alreadyHaveAccount") : t("dontHaveAccount")}</span>
            <Link className="admin-icon-link" to={isRegisterMode ? customerLoginPath : customerRegisterPath}>
              {isRegisterMode ? t("login") : t("createAccount")}
            </Link>
          </div>
        ) : null}

        <Link className="admin-back-link" to={publicBackPath}>
          <ArrowRight size={18} aria-hidden="true" />
          <span>{t("backToPublicSite")}</span>
        </Link>
      </section>
    </main>
  );
}
