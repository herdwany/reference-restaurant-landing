import { AlertTriangle, Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ADMIN_APPWRITE_REQUIRED_MESSAGE } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedAdminRoute() {
  const { isAuthConfigured, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (!isAuthConfigured) {
    return (
      <main className="admin-standalone" dir="rtl">
        <section className="admin-status-card" role="alert">
          <AlertTriangle aria-hidden="true" />
          <h1>{ADMIN_APPWRITE_REQUIRED_MESSAGE}</h1>
          <p>أضف متغيرات Appwrite في ملف البيئة ثم أعد تشغيل Vite لتفعيل الدخول إلى اللوحة.</p>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="admin-standalone" dir="rtl">
        <section className="admin-status-card" aria-busy="true">
          <Loader2 className="admin-spin" aria-hidden="true" />
          <h1>جاري التحقق من الجلسة</h1>
          <p>نراجع حالة تسجيل الدخول قبل فتح لوحة التحكم.</p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
