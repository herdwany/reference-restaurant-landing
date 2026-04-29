import { Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../lib/i18n/I18nContext";
import AdminErrorState from "./components/AdminErrorState";
import { adminFeatureIcons } from "./adminFeatureIcons";
import { adminMainFeatures } from "./adminFeatures";
import { getRoleLabel } from "./adminLabels";
import { useActiveRestaurantScope } from "./hooks/useActiveRestaurantScope";

const overviewCards = adminMainFeatures.filter((feature) => feature.id !== "overview");

export default function AdminOverview() {
  const { t } = useI18n();
  const { currentUser, profile, role } = useAuth();
  const { activeRestaurantId, activeRestaurantName, activeRestaurantSlug, canAccessFeature, clientHasFeature, scopeError } =
    useActiveRestaurantScope();
  const displayName = profile?.fullName || currentUser?.name || currentUser?.email || t("adminUser");
  const displayEmail = profile?.email || currentUser?.email || t("notAvailable");
  const roleLabel = getRoleLabel(role, t);
  const restaurantName = activeRestaurantName || (activeRestaurantId ? t("notAvailable") : t("notLinked"));

  const getFeatureLabel = (featureId: string, fallback: string) => {
    if (featureId === "dishes") return t("dishes");
    if (featureId === "offers") return t("offers");
    if (featureId === "orders") return t("orders");
    if (featureId === "reservations") return t("reservations");
    if (featureId === "settings") return t("settings");
    if (featureId === "faqs") return t("faqs");
    if (featureId === "gallery") return t("galleryManager");
    if (featureId === "activity") return t("activity");
    if (featureId === "preview") return t("previewSite");
    return fallback;
  };

  const getFeatureDescription = (featureId: string, fallback: string) => {
    if (featureId === "dishes") return t("featureDishesDescription");
    if (featureId === "offers") return t("featureOffersDescription");
    if (featureId === "orders") return t("featureOrdersDescription");
    if (featureId === "reservations") return t("featureReservationsDescription");
    if (featureId === "settings") return t("featureSettingsDescription");
    if (featureId === "faqs") return t("featureFaqsDescription");
    if (featureId === "gallery") return t("featureGalleryDescription");
    if (featureId === "activity") return t("featureActivityDescription");
    if (featureId === "preview") return t("featurePreviewDescription");
    return fallback;
  };

  if (scopeError) {
    return (
      <section className="admin-overview">
        <AdminErrorState title={t("accessDenied")} message={scopeError} />
      </section>
    );
  }

  return (
    <section className="admin-overview">
      <div className="admin-overview__hero">
        <div>
          <span>{t("welcome")}</span>
          <h2>{displayName}</h2>
          <p>{t("overviewDescription")}</p>
        </div>
        <Link className="admin-primary-link" to="/">
          <Eye size={19} aria-hidden="true" />
          <span>{t("previewSite")}</span>
        </Link>
      </div>

      <div className="admin-identity-card" aria-label={t("accountDetails")}>
        <div>
          <span>{t("accountName")}</span>
          <strong>{displayName}</strong>
        </div>
        <div>
          <span>{t("email")}</span>
          <strong>{displayEmail}</strong>
        </div>
        <div>
          <span>{t("role")}</span>
          <strong>{roleLabel}</strong>
        </div>
        <div>
          <span>{t("restaurant")}</span>
          <strong>{restaurantName}</strong>
        </div>
        {activeRestaurantSlug ? (
          <div>
            <span>Slug</span>
            <strong>{activeRestaurantSlug}</strong>
          </div>
        ) : null}
        {activeRestaurantId ? (
          <div className="admin-identity-card__debug">
            <span>Restaurant ID</span>
            <code>{activeRestaurantId}</code>
          </div>
        ) : null}
      </div>

      <div className="admin-overview__grid">
        {overviewCards.map((feature) => {
          const Icon = adminFeatureIcons[feature.icon];
          const hasPlanAccess = feature.featureKey ? canAccessFeature(feature.featureKey) : true;
          const clientFeatureEnabled = feature.featureKey ? clientHasFeature(feature.featureKey) : true;
          const canOpenFeature = feature.status === "active" && (hasPlanAccess || feature.allowWhenFeatureDisabled);
          const statusLabel =
            role === "agency_admin" && !clientFeatureEnabled
              ? t("inactive")
              : hasPlanAccess
                ? feature.status === "active"
                  ? t("available")
                  : t("soon")
                : t("upgradeRequired");
          const cardContent = (
            <>
              <div className="admin-placeholder-card__icon">
                <Icon size={22} aria-hidden="true" />
              </div>
              <div>
                <h3>{getFeatureLabel(feature.id, feature.label)}</h3>
                <p>{getFeatureDescription(feature.id, feature.description)}</p>
              </div>
              <span>{statusLabel}</span>
            </>
          );

          if (canOpenFeature) {
            return (
              <Link className="admin-placeholder-card admin-placeholder-card--link" to={feature.path} key={feature.id}>
                {cardContent}
              </Link>
            );
          }

          return (
            <article className="admin-placeholder-card" key={feature.id}>
              {cardContent}
            </article>
          );
        })}
      </div>
    </section>
  );
}
