import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, LogOut, RotateCcw, UserRound } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AdminErrorState from "../admin/components/AdminErrorState";
import { useAuth } from "../context/AuthContext";
import { restaurantConfig } from "../data/restaurantConfig";
import { useCart } from "../hooks/useCart";
import { mapKnownErrorToFriendlyMessage } from "../lib/friendlyErrors";
import { useI18n } from "../lib/i18n/I18nContext";
import { getPublicThemeClassNames, getPublicThemeStyle } from "../lib/publicTheme";
import {
  getCustomerProfileByUser,
  upsertCustomerProfile,
  type CustomerProfileInput,
} from "../services/repositories/customerProfileRepository";
import {
  getCustomerAccountHistory,
  getCustomerOrderItemsForReorder,
} from "../services/repositories/customerAccountRepository";
import { getSiteDataBySlug, type SiteDataResult } from "../services/siteDataService";
import type { CustomerProfile, Order, Reservation } from "../types/platform";
import { formatPrice } from "../utils/formatters";
import EmailVerificationGate from "./EmailVerificationGate";

type CustomerAccountPageProps = {
  restaurantSlug: string;
};

type CustomerAccountTab = "details" | "orders" | "reservations";

type ProfileFormValues = {
  city: string;
  defaultAddress: string;
  deliveryNotes: string;
  email: string;
  fullName: string;
  phone: string;
};

const emptyProfileFormValues: ProfileFormValues = {
  city: "",
  defaultAddress: "",
  deliveryNotes: "",
  email: "",
  fullName: "",
  phone: "",
};

const orderStatusKeys: Record<string, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  new: "orderStatusNew",
  confirmed: "orderStatusConfirmed",
  preparing: "orderStatusPreparing",
  ready: "orderStatusReady",
  out_for_delivery: "orderStatusOutForDelivery",
  completed: "orderStatusCompleted",
  cancelled: "orderStatusCancelled",
  rejected: "orderStatusRejected",
};

const reservationStatusKeys: Record<string, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  new: "reservationStatusNew",
  pending_confirmation: "reservationStatusPendingConfirmation",
  confirmed: "reservationStatusConfirmed",
  deposit_required: "reservationStatusDepositRequired",
  deposit_paid: "reservationStatusDepositPaid",
  seated: "reservationStatusSeated",
  completed: "reservationStatusCompleted",
  no_show: "reservationStatusNoShow",
  cancelled: "reservationStatusCancelled",
  rejected: "reservationStatusRejected",
};

const toFormValues = (
  profile: CustomerProfile | null,
  fallback: { email?: string; name?: string },
): ProfileFormValues => ({
  city: profile?.city ?? "",
  defaultAddress: profile?.defaultAddress ?? "",
  deliveryNotes: profile?.deliveryNotes ?? "",
  email: profile?.email ?? fallback.email ?? "",
  fullName: profile?.fullName ?? fallback.name ?? "",
  phone: profile?.phone ?? "",
});

const formatDate = (value: string | undefined, language: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function CustomerAccountPage({ restaurantSlug }: CustomerAccountPageProps) {
  const { currentLanguage, direction, t } = useI18n();
  const {
    adminAccessIssue,
    currentUser,
    isAgencyAdmin,
    isAuthenticated,
    isLoading: isAuthLoading,
    isOwner,
    isStaff,
    logout,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const cart = useCart();
  const [siteData, setSiteData] = useState<SiteDataResult | null>(null);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [isSiteLoading, setIsSiteLoading] = useState(true);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [formValues, setFormValues] = useState<ProfileFormValues>(emptyProfileFormValues);
  const [activeTab, setActiveTab] = useState<CustomerAccountTab>("details");
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isReordering, setIsReordering] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const publicPath = `/r/${restaurantSlug}`;
  const accountLoginPath = `${publicPath}/account/login`;
  const accountRegisterPath = `${publicPath}/account/register`;
  const restaurantId = siteData?.config.restaurant.id ?? "";
  const restaurantName = siteData?.config.restaurant.name ?? restaurantSlug;
  const isAdminSession = isAgencyAdmin || isOwner || isStaff;
  const hasBlockingProfileIssue = Boolean(adminAccessIssue && adminAccessIssue !== "missing_profile");
  const accountPageClassName = useMemo(() => {
    if (!siteData) {
      return "customer-account-page";
    }

    const backgroundStyle = siteData.config.settings.backgroundStyle || "warm";
    const buttonStyle = siteData.config.settings.buttonStyle || "rounded";

    return `${getPublicThemeClassNames(siteData.config, "customer-account-page auth-page--branded")} auth-page--background-${backgroundStyle} auth-page--button-${buttonStyle}`;
  }, [siteData]);
  const accountPageStyle = siteData ? getPublicThemeStyle(siteData.config) : undefined;

  useEffect(() => {
    let isMounted = true;

    const loadSite = async () => {
      setIsSiteLoading(true);
      setSiteError(null);

      try {
        const result = await getSiteDataBySlug(restaurantSlug);

        if (isMounted) {
          setSiteData(result);
        }
      } catch (error) {
        if (isMounted) {
          setSiteError(mapKnownErrorToFriendlyMessage(error, t));
        }
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
    const state = location.state as { accountNotice?: string } | null;

    if (!state?.accountNotice) {
      return;
    }

    setNotice(state.accountNotice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const loadAccountData = useCallback(async () => {
    if (!currentUser?.emailVerification || !restaurantId || isAdminSession || hasBlockingProfileIssue) {
      return;
    }

    setIsLoadingAccount(true);
    setErrorMessage(null);

    try {
      const [profile, history] = await Promise.all([
        getCustomerProfileByUser(restaurantId, currentUser.$id).catch(() => null),
        getCustomerAccountHistory({
          restaurantId,
          restaurantSlug,
          userId: currentUser.$id,
        }),
      ]);

      setCustomerProfile(profile);
      setFormValues(toFormValues(profile, { email: currentUser.email, name: currentUser.name }));
      setOrders(history.orders);
      setReservations(history.reservations);
    } catch (error) {
      setErrorMessage(mapKnownErrorToFriendlyMessage(error, t));
    } finally {
      setIsLoadingAccount(false);
    }
  }, [currentUser, hasBlockingProfileIssue, isAdminSession, restaurantId, restaurantSlug, t]);

  useEffect(() => {
    void loadAccountData();
  }, [loadAccountData]);

  const updateFormValue = <Key extends keyof ProfileFormValues>(key: Key, value: ProfileFormValues[Key]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    setNotice(null);
    setErrorMessage(null);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUser || !restaurantId) {
      return;
    }

    setIsSavingProfile(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      const input: CustomerProfileInput = {
        restaurantId,
        userId: currentUser.$id,
        email: formValues.email,
        fullName: formValues.fullName,
        phone: formValues.phone,
        defaultAddress: formValues.defaultAddress,
        city: formValues.city,
        deliveryNotes: formValues.deliveryNotes,
      };
      const savedProfile = await upsertCustomerProfile(input);
      setCustomerProfile(savedProfile);
      setFormValues(toFormValues(savedProfile, { email: currentUser.email, name: currentUser.name }));
      setNotice(t("accountProfileSaved"));
    } catch (error) {
      setErrorMessage(mapKnownErrorToFriendlyMessage(error, t));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate(publicPath, { replace: true });
  };

  const handleSwitchAccount = async () => {
    await logout();
    navigate(accountLoginPath, { replace: true });
  };

  const reorder = async (order: Order) => {
    setIsReordering(order.id);
    setErrorMessage(null);
    setNotice(null);

    try {
      if (!currentUser) {
        return;
      }

      const items = await getCustomerOrderItemsForReorder(
        {
          restaurantId,
          restaurantSlug,
          userId: currentUser.$id,
        },
        order.id,
      );
      const fallbackImage = siteData?.config.brand.heroImage || restaurantConfig.brand.heroImage;

      items.forEach((item) => {
        cart.addItem(
          {
            id: item.dishId || item.id,
            name: item.dishName,
            price: item.unitPrice,
            image: fallbackImage,
          },
          item.dishId ? "dish" : "menu",
          item.quantity,
        );
      });

      setNotice(t("previousOrderAddedToCart"));
      navigate(publicPath);
    } catch (error) {
      setErrorMessage(mapKnownErrorToFriendlyMessage(error, t));
    } finally {
      setIsReordering(null);
    }
  };

  const tabs = useMemo(
    () => [
      { id: "details" as const, label: t("myDetails") },
      { id: "orders" as const, label: t("myOrders") },
      { id: "reservations" as const, label: t("myReservations") },
    ],
    [t],
  );

  if (isSiteLoading || isAuthLoading) {
    return (
      <main className={`${accountPageClassName} dir-${direction}`} dir={direction} style={accountPageStyle}>
        <section className="customer-account-card customer-account-card--centered" role="status" aria-busy="true">
          <Loader2 className="admin-spin" aria-hidden="true" />
          <h1>{t("loading")}</h1>
        </section>
      </main>
    );
  }

  if (siteData?.isNotFound || siteError) {
    return <Navigate to={publicPath} replace />;
  }

  if (!isAuthenticated) {
    return (
      <main className={`${accountPageClassName} dir-${direction}`} dir={direction} style={accountPageStyle}>
        <section className="customer-account-card customer-account-card--centered">
          <UserRound aria-hidden="true" />
          <span>{restaurantName}</span>
          <h1>{t("customerAccount")}</h1>
          <p>{t("signInToViewAccount")}</p>
          <Link className="admin-primary-link" to={accountLoginPath}>
            {t("login")}
          </Link>
          <Link className="admin-icon-link" to={accountRegisterPath}>
            {t("createAccount")}
          </Link>
          <Link className="admin-back-link" to={publicPath}>
            {t("backToPublicSite")}
          </Link>
        </section>
      </main>
    );
  }

  if (currentUser && !currentUser.emailVerification) {
    return (
      <EmailVerificationGate
        backPath={publicPath}
        brandName={restaurantName}
        logoUrl={siteData?.config.restaurant.logoImage}
        onLogout={async () => {
          await logout();
          navigate(publicPath, { replace: true });
        }}
        onSwitchAccount={async () => {
          await logout();
          navigate(accountLoginPath, { replace: true });
        }}
        pageClassName={accountPageClassName}
        restaurantSlug={restaurantSlug}
        style={accountPageStyle}
      />
    );
  }

  if (isAdminSession || hasBlockingProfileIssue) {
    return (
      <main className={`${accountPageClassName} dir-${direction}`} dir={direction} style={accountPageStyle}>
        <section className="customer-account-card customer-account-card--centered">
          <AlertTriangle aria-hidden="true" />
          <h1>{isAdminSession ? t("customerAccountOnly") : t("currentSessionHasIssue")}</h1>
          <p>{isAdminSession ? t("useCustomerAccount") : t("currentSessionHasIssue")}</p>
          <button className="admin-primary-link" type="button" onClick={() => void handleLogout()}>
            {t("logout")}
          </button>
          <button className="admin-primary-link" type="button" onClick={() => void handleSwitchAccount()}>
            {t("switchAccount")}
          </button>
          <Link className="admin-back-link" to={publicPath}>
            {t("backToPublicSite")}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={`${accountPageClassName} dir-${direction}`} dir={direction} style={accountPageStyle}>
      <section className="customer-account-shell">
        <header className="customer-account-header">
          <div>
            <span>{restaurantName}</span>
            <h1>{t("customerAccount")}</h1>
          </div>
          <div className="customer-account-header__actions">
            <Link className="admin-icon-link" to={publicPath}>
              {t("backToPublicSite")}
            </Link>
            <button className="admin-icon-link" type="button" onClick={() => void handleLogout()}>
              <LogOut size={18} aria-hidden="true" />
              {t("logout")}
            </button>
          </div>
        </header>

        <nav className="customer-account-tabs" aria-label={t("customerAccount")}>
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "is-active" : ""}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              key={tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {notice ? <div className="admin-form-note">{notice}</div> : null}
        {errorMessage ? <AdminErrorState title={t("operationFailed")} message={errorMessage} /> : null}

        {isLoadingAccount ? (
          <section className="customer-account-card customer-account-card--centered" role="status" aria-busy="true">
            <Loader2 className="admin-spin" aria-hidden="true" />
            <p>{t("loading")}</p>
          </section>
        ) : activeTab === "details" ? (
          <section className="customer-account-card">
            <form className="customer-profile-form" onSubmit={saveProfile}>
              <label>
                <span>{t("customerName")}</span>
                <input
                  value={formValues.fullName}
                  onChange={(event) => updateFormValue("fullName", event.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                <span>{t("customerPhone")}</span>
                <input
                  value={formValues.phone}
                  onChange={(event) => updateFormValue("phone", event.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </label>
              <label>
                <span>{t("email")}</span>
                <input
                  value={formValues.email}
                  onChange={(event) => updateFormValue("email", event.target.value)}
                  autoComplete="email"
                  type="email"
                />
              </label>
              <label>
                <span>{t("city")}</span>
                <input value={formValues.city} onChange={(event) => updateFormValue("city", event.target.value)} />
              </label>
              <label className="customer-profile-form__wide">
                <span>{t("defaultAddress")}</span>
                <input
                  value={formValues.defaultAddress}
                  onChange={(event) => updateFormValue("defaultAddress", event.target.value)}
                  autoComplete="street-address"
                />
              </label>
              <label className="customer-profile-form__wide">
                <span>{t("deliveryNotes")}</span>
                <textarea
                  value={formValues.deliveryNotes}
                  onChange={(event) => updateFormValue("deliveryNotes", event.target.value)}
                  rows={3}
                />
              </label>
              <button className="admin-primary-link customer-profile-form__wide" type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? t("saving") : t("saveProfile")}
              </button>
            </form>
          </section>
        ) : activeTab === "orders" ? (
          <section className="customer-account-list">
            {orders.length === 0 ? (
              <div className="customer-account-card customer-account-card--centered">
                <p>{t("noCustomerOrders")}</p>
              </div>
            ) : (
              orders.map((order) => (
                <article className="customer-history-card" key={order.id}>
                  <div>
                    <span>{order.trackingCode || order.id}</span>
                    <h2>{formatPrice(order.totalAmount, siteData?.config.restaurant.currency ?? "MAD")}</h2>
                    <p>{formatDate(order.createdAt, currentLanguage)}</p>
                  </div>
                  <strong>{orderStatusKeys[order.status] ? t(orderStatusKeys[order.status]) : order.status}</strong>
                  <button
                    className="admin-primary-link"
                    type="button"
                    onClick={() => void reorder(order)}
                    disabled={isReordering === order.id}
                  >
                    <RotateCcw size={17} aria-hidden="true" />
                    {isReordering === order.id ? t("loading") : t("reorder")}
                  </button>
                </article>
              ))
            )}
          </section>
        ) : (
          <section className="customer-account-list">
            {reservations.length === 0 ? (
              <div className="customer-account-card customer-account-card--centered">
                <p>{t("noCustomerReservations")}</p>
              </div>
            ) : (
              reservations.map((reservation) => (
                <article className="customer-history-card" key={reservation.id}>
                  <div>
                    <span>{reservation.trackingCode || reservation.id}</span>
                    <h2>
                      {reservation.reservationDate} {reservation.reservationTime}
                    </h2>
                    <p>
                      {reservation.peopleCount} {t("peopleCount")}
                    </p>
                  </div>
                  <strong>
                    {reservationStatusKeys[reservation.status] ? t(reservationStatusKeys[reservation.status]) : reservation.status}
                  </strong>
                </article>
              ))
            )}
          </section>
        )}
      </section>
    </main>
  );
}
