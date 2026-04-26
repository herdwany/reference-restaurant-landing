import {
  CalendarCheck,
  Eye,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBag,
  Tag,
  Utensils,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type AdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const disabledItems = [
  { label: "الأطباق والمنيو", icon: Utensils },
  { label: "العروض", icon: Tag },
  { label: "الطلبات", icon: ShoppingBag },
  { label: "الحجوزات", icon: CalendarCheck },
  { label: "الإعدادات", icon: Settings },
];

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
          <NavLink className="admin-sidebar__link" to="/admin" end onClick={onClose}>
            <LayoutDashboard size={19} aria-hidden="true" />
            <span>نظرة عامة</span>
          </NavLink>

          {disabledItems.map((item) => {
            const Icon = item.icon;

            return (
              <button className="admin-sidebar__link admin-sidebar__link--disabled" type="button" key={item.label} disabled>
                <Icon size={19} aria-hidden="true" />
                <span>{item.label}</span>
                <small>قريبًا</small>
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <Link className="admin-sidebar__link" to="/" onClick={onClose}>
            <Eye size={19} aria-hidden="true" />
            <span>معاينة الموقع</span>
          </Link>
          <button className="admin-sidebar__link admin-sidebar__logout" type="button" onClick={handleLogout} disabled={isLoggingOut}>
            <LogOut size={19} aria-hidden="true" />
            <span>{isLoggingOut ? "جاري الخروج..." : "تسجيل الخروج"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
