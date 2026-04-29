import { LogOut, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../lib/i18n/I18nContext";
import { adminFeatureIcons } from "../adminFeatureIcons";
import { adminFooterFeatures, adminMainFeatures } from "../adminFeatures";
import { useActiveRestaurantScope } from "../hooks/useActiveRestaurantScope";

type AdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { t } = useI18n();
  const { logout } = useAuth();
  const { canAccessFeature, clientHasFeature, role } = useActiveRestaurantScope();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      navigate("/admin/login", { replace: true });
    }
  };

  const getFeatureLabel = (featureId: string, fallback: string) => {
    if (featureId === "overview") return t("overview");
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

  return (
    <>
      {isOpen ? (
        <button className="admin-sidebar__overlay is-visible" type="button" aria-label={t("closeMenu")} onClick={onClose} />
      ) : null}

      <aside className={`admin-sidebar${isOpen ? " is-open" : ""}`} aria-label={t("restaurantDashboard")}>
        <div className="admin-sidebar__header">
          <Link className="admin-sidebar__brand" to="/admin" onClick={onClose}>
            <span>{t("restaurantDashboard").slice(0, 1)}</span>
            <strong>{t("restaurantDashboard")}</strong>
          </Link>
          <button className="admin-sidebar__close" type="button" aria-label={t("closeMenu")} onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          {adminMainFeatures.map((feature) => {
            const Icon = adminFeatureIcons[feature.icon];
            const hasPlanAccess = feature.featureKey ? canAccessFeature(feature.featureKey) : true;
            const clientFeatureEnabled = feature.featureKey ? clientHasFeature(feature.featureKey) : true;
            const shouldDisable = feature.status === "coming_soon" || (!hasPlanAccess && !feature.allowWhenFeatureDisabled);
            const showAgencyClientBadge = role === "agency_admin" && feature.featureKey && !clientFeatureEnabled;

            if (shouldDisable) {
              return (
                <button
                  className="admin-sidebar__link admin-sidebar__link--disabled"
                  type="button"
                  title={feature.status === "coming_soon" ? t("featureComingSoon") : t("featureNotInPlan")}
                  key={feature.id}
                  disabled
                >
                  <Icon size={19} aria-hidden="true" />
                  <span className="admin-sidebar__link-text">
                    <span className="admin-sidebar__link-label">{getFeatureLabel(feature.id, feature.label)}</span>
                    <small>{feature.status === "coming_soon" ? t("soon") : t("upgradeRequired")}</small>
                  </span>
                </button>
              );
            }

            return (
              <NavLink className="admin-sidebar__link" to={feature.path} end={feature.path === "/admin"} onClick={onClose} key={feature.id}>
                <Icon size={19} aria-hidden="true" />
                <span className="admin-sidebar__link-text">
                  <span className="admin-sidebar__link-label">{getFeatureLabel(feature.id, feature.label)}</span>
                  {showAgencyClientBadge ? <small>{t("inactive")}</small> : null}
                  {!hasPlanAccess && feature.allowWhenFeatureDisabled ? <small>{t("upgradeRequired")}</small> : null}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          {adminFooterFeatures.map((feature) => {
            const Icon = adminFeatureIcons[feature.icon];

            return (
              <Link className="admin-sidebar__link" to={feature.path} onClick={onClose} key={feature.id}>
                <Icon size={19} aria-hidden="true" />
                <span className="admin-sidebar__link-text">
                  <span className="admin-sidebar__link-label">{getFeatureLabel(feature.id, feature.label)}</span>
                </span>
              </Link>
            );
          })}
          <button className="admin-sidebar__link admin-sidebar__logout" type="button" onClick={handleLogout} disabled={isLoggingOut}>
            <LogOut size={19} aria-hidden="true" />
            <span className="admin-sidebar__link-text">
              <span className="admin-sidebar__link-label">{isLoggingOut ? t("loggedOut") : t("logout")}</span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
