import { LogOut, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { adminFeatureIcons } from "../adminFeatureIcons";
import { adminFooterFeatures, adminMainFeatures } from "../adminFeatures";

type AdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { logout } = useAuth();
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

  return (
    <>
      <button
        className={`admin-sidebar__overlay${isOpen ? " is-visible" : ""}`}
        type="button"
        aria-label="إغلاق القائمة"
        onClick={onClose}
      />

      <aside className={`admin-sidebar${isOpen ? " is-open" : ""}`} aria-label="قائمة لوحة التحكم">
        <div className="admin-sidebar__header">
          <Link className="admin-sidebar__brand" to="/admin" onClick={onClose}>
            <span>ر</span>
            <strong>لوحة المطعم</strong>
          </Link>
          <button className="admin-sidebar__close" type="button" aria-label="إغلاق القائمة" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          {adminMainFeatures.map((feature) => {
            const Icon = adminFeatureIcons[feature.icon];

            if (feature.status === "coming_soon") {
              return (
                <button className="admin-sidebar__link admin-sidebar__link--disabled" type="button" key={feature.id} disabled>
                  <Icon size={19} aria-hidden="true" />
                  <span>{feature.label}</span>
                  <small>قريبًا</small>
                </button>
              );
            }

            return (
              <NavLink className="admin-sidebar__link" to={feature.path} end={feature.path === "/admin"} onClick={onClose} key={feature.id}>
                <Icon size={19} aria-hidden="true" />
                <span>{feature.label}</span>
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
                <span>{feature.label}</span>
              </Link>
            );
          })}
          <button className="admin-sidebar__link admin-sidebar__logout" type="button" onClick={handleLogout} disabled={isLoggingOut}>
            <LogOut size={19} aria-hidden="true" />
            <span>{isLoggingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
