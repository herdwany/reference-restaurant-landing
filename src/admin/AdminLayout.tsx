import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import AdminErrorState from "./components/AdminErrorState";
import AdminSidebar from "./components/AdminSidebar";
import AdminTopbar from "./components/AdminTopbar";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../lib/i18n/I18nContext";
import { useActiveRestaurantScope } from "./hooks/useActiveRestaurantScope";

export default function AdminLayout() {
  const { direction, t } = useI18n();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAgencyAdmin } = useAuth();
  const { activeRestaurantId, scopeError } = useActiveRestaurantScope();
  const shouldBlockForAgencySelection = isAgencyAdmin && !activeRestaurantId;

  return (
    <div className={`admin-shell dir-${direction}`} dir={direction}>
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="admin-main">
        <AdminTopbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="admin-content">
          {shouldBlockForAgencySelection && scopeError ? (
            <AdminErrorState
              title={t("agencySelectionRequired")}
              message={scopeError}
              action={
                <Link className="admin-primary-link" to="/agency">
                  {t("agencyDashboard")}
                </Link>
              }
            />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
