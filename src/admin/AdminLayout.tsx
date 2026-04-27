import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import AdminErrorState from "./components/AdminErrorState";
import AdminSidebar from "./components/AdminSidebar";
import AdminTopbar from "./components/AdminTopbar";
import { useAuth } from "../context/AuthContext";
import { useActiveRestaurantScope } from "./hooks/useActiveRestaurantScope";

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAgencyAdmin } = useAuth();
  const { activeRestaurantId, scopeError } = useActiveRestaurantScope();
  const shouldBlockForAgencySelection = isAgencyAdmin && !activeRestaurantId;

  return (
    <div className="admin-shell" dir="rtl">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="admin-main">
        <AdminTopbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="admin-content">
          {shouldBlockForAgencySelection && scopeError ? (
            <AdminErrorState
              title="اختر مطعمًا أولًا"
              message={scopeError}
              action={
                <Link className="admin-primary-link" to="/agency">
                  العودة إلى لوحة الوكالة
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
