import { Building2, Eye, Menu } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearAgencySelectedRestaurant } from "../../agency/agencySelection";
import { useAuth } from "../../context/AuthContext";
import { getAdminFeatureForPath } from "../adminFeatures";
import { getRoleLabel } from "../adminLabels";
import { useActiveRestaurantScope } from "../hooks/useActiveRestaurantScope";

type AdminTopbarProps = {
  onMenuClick: () => void;
};

export default function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const { currentUser, isAgencyAdmin, profile, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeRestaurantId, activeRestaurantName, activeRestaurantSlug } = useActiveRestaurantScope();
  const activeFeature = getAdminFeatureForPath(location.pathname);
  const displayName = profile?.fullName || currentUser?.name || currentUser?.email || "مستخدم اللوحة";
  const roleLabel = getRoleLabel(role);
  const showAgencyMode = isAgencyAdmin && Boolean(activeRestaurantId);

  const clearAgencySelection = () => {
    clearAgencySelectedRestaurant();
    navigate("/agency");
  };

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__title">
        <button className="admin-topbar__menu" type="button" aria-label="فتح القائمة" onClick={onMenuClick}>
          <Menu size={21} aria-hidden="true" />
        </button>
        <div>
          <span>لوحة التحكم</span>
          <h1>{activeFeature.label}</h1>
        </div>
      </div>

      <div className="admin-topbar__actions">
        {showAgencyMode ? (
          <div className="admin-agency-mode" title={activeRestaurantSlug ?? undefined}>
            <span className="admin-agency-mode__text">وضع الوكالة: تدير الآن {activeRestaurantName}</span>
            <Link className="admin-icon-link" to="/agency">
              تغيير المطعم
            </Link>
            <button className="admin-icon-link" type="button" onClick={clearAgencySelection}>
              إلغاء الاختيار
            </button>
          </div>
        ) : null}
        {isAgencyAdmin ? (
          <Link className="admin-icon-link" to="/agency" aria-label="لوحة الوكالة">
            <Building2 size={19} aria-hidden="true" />
            <span>لوحة الوكالة</span>
          </Link>
        ) : null}
        <Link className="admin-icon-link" to="/" aria-label="معاينة الموقع">
          <Eye size={19} aria-hidden="true" />
          <span>معاينة الموقع</span>
        </Link>
        <div className="admin-user-chip" title={displayName}>
          <span>{displayName.slice(0, 1).toUpperCase()}</span>
          <strong>{displayName}</strong>
        </div>
        <span className="admin-role-badge">{roleLabel}</span>
      </div>
    </header>
  );
}
