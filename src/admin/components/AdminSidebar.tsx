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
    if (featureId === "overview") return t("dashboard");
    if (featureId === "dishes") return t("dishes");
    if (featureId === "offers") return t("offers");
    if (featureId === "orders") return t("orders");
    if (featureId === "reservations") return t("reservations");
    if (featureId === "settings") return t("settings");
    if (featureId === "gallery") return t("galleryManager");
    if (featureId === "activity") return t("activity");
    return fallback;
  };

  return (
    <>
      {isOpen ? (
        <button className="admin-sidebar__overlay is-visible" type="button" aria-label={t("closeMenu")} onClick={onClose} />
      ) : null}

      <aside className={`admin-sidebar${isOpen ? " is-open" : ""}`} aria-label="قائمة لوحة التحكم">
        <div className="admin-sidebar__header">
          <Link className="admin-sidebar__brand" to="/admin" onClick={onClose}>
            <span>ر</span>
            <strong>لوحة المطعم</strong>
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
                  title={feature.status === "coming_soon" ? "هذه الميزة ستتوفر لاحقًا." : "هذه الميزة غير متاحة في باقتك الحالية."}
                  key={feature.id}
                  disabled
                >
                  <Icon size={19} aria-hidden="true" />
                  <span>{getFeatureLabel(feature.id, feature.label)}</span>
                  <small>{feature.status === "coming_soon" ? "قريبًا" : t("upgradeRequired")}</small>
                </button>
              );
            }

            return (
              <NavLink className="admin-sidebar__link" to={feature.path} end={feature.path === "/admin"} onClick={onClose} key={feature.id}>
                <Icon size={19} aria-hidden="true" />
                <span>{getFeatureLabel(feature.id, feature.label)}</span>
                {showAgencyClientBadge ? <small>غير مفعلة</small> : null}
                {!hasPlanAccess && feature.allowWhenFeatureDisabled ? <small>ترقية</small> : null}
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
                <span>{getFeatureLabel(feature.id, feature.label)}</span>
              </Link>
            );
          })}
          <button className="admin-sidebar__link admin-sidebar__logout" type="button" onClick={handleLogout} disabled={isLoggingOut}>
            <LogOut size={19} aria-hidden="true" />
            <span>{isLoggingOut ? t("loggedOut") : t("logout")}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
