import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { mapKnownErrorToFriendlyMessage } from "../lib/friendlyErrors";
import { useI18n } from "../lib/i18n/I18nContext";
import { getPublicThemeClassNames, getPublicThemeStyle } from "../lib/publicTheme";
import { verifyEmail } from "../services/authService";
import { getSiteDataBySlug, type SiteDataResult } from "../services/siteDataService";

type VerifyState = "error" | "loading" | "success";

const normalizeSlug = (value: string | null) => value?.trim().toLowerCase() || "";

export default function VerifyEmailPage() {
  const { direction, t } = useI18n();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState(t("checkYourEmail"));
  const [siteData, setSiteData] = useState<SiteDataResult | null>(null);
  const restaurantSlug = normalizeSlug(searchParams.get("restaurantSlug"));
  const userId = searchParams.get("userId")?.trim() || "";
  const secret = searchParams.get("secret")?.trim() || "";

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
    let isMounted = true;

    const completeVerification = async () => {
      if (!userId || !secret) {
        setState("error");
        setMessage(t("linkExpiredOrInvalid"));
        return;
      }

      setState("loading");

      try {
        await verifyEmail(userId, secret);

        if (isMounted) {
          setState("success");
          setMessage(t("emailVerifiedSuccessfully"));
        }
      } catch (error) {
        if (isMounted) {
          setState("error");
          setMessage(mapKnownErrorToFriendlyMessage(error, t));
        }
      }
    };

    void completeVerification();

    return () => {
      isMounted = false;
    };
  }, [secret, t, userId]);

  const authClassName = useMemo(() => {
    if (!siteData) {
      return "admin-login-page";
    }

    const backgroundStyle = siteData.config.settings.backgroundStyle || "warm";
    const buttonStyle = siteData.config.settings.buttonStyle || "rounded";

    return `${getPublicThemeClassNames(siteData.config, "admin-login-page auth-page--branded")} auth-page--background-${backgroundStyle} auth-page--button-${buttonStyle}`;
  }, [siteData]);
  const style = siteData ? getPublicThemeStyle(siteData.config) : undefined;
  const continuePath = restaurantSlug ? `/r/${restaurantSlug}/account/login` : "/login";
  const backPath = restaurantSlug ? `/r/${restaurantSlug}` : "/";
  const Icon = state === "success" ? CheckCircle2 : state === "loading" ? Loader2 : MailWarning;

  return (
    <main className={`${authClassName} dir-${direction}`} dir={direction} style={style}>
      <section className="admin-login-card" aria-busy={state === "loading"}>
        <div className="admin-login-card__icon">
          <Icon className={state === "loading" ? "admin-spin" : undefined} size={30} aria-hidden="true" />
        </div>
        <div className="admin-login-card__copy">
          <h1>{state === "success" ? t("emailVerifiedSuccessfully") : t("verifyEmail")}</h1>
          <p>{message}</p>
        </div>
        {state === "success" ? (
          <Link className="admin-login-submit" to={continuePath}>
            {t("login")}
          </Link>
        ) : null}
        {state === "error" ? <div className="admin-form-alert">{message}</div> : null}
        <Link className="admin-back-link" to={backPath}>
          {t("backToPublicSite")}
        </Link>
      </section>
    </main>
  );
}
