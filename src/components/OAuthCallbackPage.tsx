import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { mapKnownErrorToFriendlyMessage } from "../lib/friendlyErrors";
import { useI18n } from "../lib/i18n/I18nContext";
import { getPublicThemeClassNames, getPublicThemeStyle } from "../lib/publicTheme";
import type { AuthUser } from "../services/authService";
import { upsertCustomerProfile } from "../services/repositories/customerProfileRepository";
import { getProfileByUserId } from "../services/repositories/profileRepository";
import { getSiteDataBySlug, type SiteDataResult } from "../services/siteDataService";
import type { Profile } from "../types/platform";
import EmailVerificationGate from "./EmailVerificationGate";

type CallbackState = "account_not_ready" | "email_verification_required" | "error" | "loading";

const normalizeSlug = (value: string | null) => value?.trim().toLowerCase() || "";

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

export default function OAuthCallbackPage() {
  const { currentUser, isLoading, logout, profile, refreshUser } = useAuth();
  const { direction, t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const restaurantSlug = normalizeSlug(searchParams.get("restaurantSlug"));
  const [siteData, setSiteData] = useState<SiteDataResult | null>(null);
  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState(t("loading"));
  const [verificationUser, setVerificationUser] = useState<AuthUser | null>(null);
  const hasStartedRoutingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!restaurantSlug) {
      setSiteData(null);
      return;
    }

    let isMounted = true;

    const loadSite = async () => {
      try {
        const result = await getSiteDataBySlug(restaurantSlug);

        if (isMounted && !result.isNotFound) {
          setSiteData(result);
        }
      } catch {
        if (isMounted) {
          setSiteData(null);
        }
      }
    };

    void loadSite();

    return () => {
      isMounted = false;
    };
  }, [restaurantSlug]);

  useEffect(() => {
    if (state !== "loading") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }

      setState("error");
      setMessage(t("oauthCallbackTimedOut"));
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [state, t]);

  useEffect(() => {
    if (isLoading || hasStartedRoutingRef.current) {
      return;
    }

    hasStartedRoutingRef.current = true;

    const completeOAuthRouting = async () => {
      setState("loading");
      setMessage(t("loading"));

      try {
        const user = currentUser ?? await refreshUser();

        if (!isMountedRef.current) {
          return;
        }

        if (!user) {
          setState("error");
          setMessage(t("oauthSessionMissing"));
          return;
        }

        if (!user.emailVerification) {
          setVerificationUser(user);
          setState("email_verification_required");
          setMessage(t("emailVerificationRequired"));
          return;
        }

        const loadedProfile = profile?.userId === user.$id ? profile : await getProfileByUserId(user.$id);
        const dashboardPath = getProfileDashboardPath(loadedProfile);

        if (dashboardPath) {
          navigate(dashboardPath, { replace: true });
          return;
        }

        if (!restaurantSlug) {
          setState("account_not_ready");
          setMessage(t("accountNotReady"));
          return;
        }

        const result = await getSiteDataBySlug(restaurantSlug);

        if (result.isNotFound || !result.config.restaurant.id) {
          setState("error");
          setMessage(t("restaurantScopeMissing"));
          return;
        }

        try {
          await upsertCustomerProfile({
            restaurantId: result.config.restaurant.id,
            userId: user.$id,
            fullName: user.name?.trim() || user.email,
            phone: "",
            email: user.email,
          });
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn(error);
          }
        }

        if (isMountedRef.current) {
          navigate(`/r/${result.resolvedSlug || restaurantSlug}/account`, { replace: true });
        }
      } catch (error) {
        if (isMountedRef.current) {
          setState("error");
          setMessage(mapKnownErrorToFriendlyMessage(error, t));
        }
      }
    };

    void completeOAuthRouting();
  }, [currentUser, isLoading, navigate, profile, refreshUser, restaurantSlug, t]);

  const authClassName = useMemo(() => {
    if (!siteData) {
      return "admin-login-page";
    }

    const backgroundStyle = siteData.config.settings.backgroundStyle || "warm";
    const buttonStyle = siteData.config.settings.buttonStyle || "rounded";

    return `${getPublicThemeClassNames(siteData.config, "admin-login-page auth-page--branded")} auth-page--background-${backgroundStyle} auth-page--button-${buttonStyle}`;
  }, [siteData]);
  const style = siteData ? getPublicThemeStyle(siteData.config) : undefined;
  const backPath = restaurantSlug ? `/r/${restaurantSlug}` : "/";

  const emailVerificationUser = verificationUser ?? currentUser;

  if (
    emailVerificationUser &&
    !emailVerificationUser.emailVerification &&
    (state === "email_verification_required" || !isLoading)
  ) {
    return (
      <EmailVerificationGate
        backPath={backPath}
        brandName={siteData?.config.restaurant.name}
        logoUrl={siteData?.config.restaurant.logoImage}
        onLogout={async () => {
          await logout();
          navigate(backPath, { replace: true });
        }}
        onSwitchAccount={async () => {
          await logout();
          navigate(restaurantSlug ? `/r/${restaurantSlug}/account/login` : "/login", { replace: true });
        }}
        pageClassName={authClassName}
        restaurantSlug={restaurantSlug || undefined}
        style={style}
      />
    );
  }

  return (
    <main className={`${authClassName} dir-${direction}`} dir={direction} style={style}>
      <section className="admin-login-card" aria-busy={state === "loading"}>
        <div className="admin-login-card__icon">
          {state === "loading" ? (
            <Loader2 className="admin-spin" size={30} aria-hidden="true" />
          ) : (
            <AlertTriangle size={30} aria-hidden="true" />
          )}
        </div>
        <div className="admin-login-card__copy">
          <h1>
            {state === "account_not_ready"
              ? t("accountNotReady")
              : state === "email_verification_required"
                ? t("verifyEmail")
                : state === "error"
                  ? t("loginFailed")
                  : t("loading")}
          </h1>
          <p>{message}</p>
        </div>
        {state !== "loading" ? (
          <div className="admin-session-actions">
            <Link className="admin-login-submit" to={restaurantSlug ? `/r/${restaurantSlug}/account/login` : "/login"}>
              {t("login")}
            </Link>
            <Link className="admin-back-link" to={backPath}>
              {t("backToPublicSite")}
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
