import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import AdminErrorState from "./components/AdminErrorState";
import AdminSidebar from "./components/AdminSidebar";
import AdminTopbar from "./components/AdminTopbar";
import { useActiveRestaurantScope } from "./hooks/useActiveRestaurantScope";

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { requiresAgencySelection, scopeError } = useActiveRestaurantScope();

  return (
    <div className="admin-shell" dir="rtl">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="admin-main">
        <AdminTopbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="admin-content">
          {requiresAgencySelection && scopeError ? (
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
