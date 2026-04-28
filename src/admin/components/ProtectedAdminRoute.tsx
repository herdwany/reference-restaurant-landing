import { AlertTriangle, Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ADMIN_APPWRITE_REQUIRED_MESSAGE } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../lib/i18n/I18nContext";

type AdminStatusMessageProps = {
  title: string;
  body: string;
  isLoading?: boolean;
};

function AdminStatusMessage({ title, body, isLoading = false }: AdminStatusMessageProps) {
  const { direction } = useI18n();
  const Icon = isLoading ? Loader2 : AlertTriangle;

  return (
    <main className={`admin-standalone dir-${direction}`} dir={direction}>
      <section className="admin-status-card" role={isLoading ? undefined : "alert"} aria-busy={isLoading}>
        <Icon className={isLoading ? "admin-spin" : undefined} aria-hidden="true" />
        <h1>{title}</h1>
        <p>{body}</p>
      </section>
    </main>
  );
}

export default function ProtectedAdminRoute() {
  const { adminAccessIssue, hasAdminAccess, isAuthConfigured, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (!isAuthConfigured) {
    return (
      <AdminStatusMessage
        title={ADMIN_APPWRITE_REQUIRED_MESSAGE}
        body="أضف متغيرات Appwrite في ملف البيئة ثم أعد تشغيل Vite لتفعيل الدخول إلى اللوحة."
      />
    );
  }

  if (isLoading) {
    return (
      <AdminStatusMessage
        title="جاري التحقق من الجلسة"
        body="نراجع حالة تسجيل الدخول وصلاحيات الحساب قبل فتح لوحة التحكم."
        isLoading
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (adminAccessIssue === "missing_profile") {
    return (
      <AdminStatusMessage
        title="الحساب غير مرتبط"
        body="تم تسجيل الدخول، لكن لم يتم ربط حسابك بأي موقع بعد. تواصل مع مدير النظام."
      />
    );
  }

  if (adminAccessIssue === "inactive_profile") {
    return (
      <AdminStatusMessage
        title="الحساب معطل"
        body="تم تعطيل هذا الحساب. تواصل مع مدير النظام."
      />
    );
  }

  if (adminAccessIssue === "unknown_role") {
    return <AdminStatusMessage title="صلاحية غير معروفة" body="صلاحية غير معروفة." />;
  }

  if (adminAccessIssue === "missing_restaurant") {
    return <AdminStatusMessage title="المطعم غير مرتبط" body="لم يتم ربط هذا الحساب بمطعم." />;
  }

  if (!hasAdminAccess) {
    return <AdminStatusMessage title="تعذر فتح اللوحة" body="لا يملك هذا الحساب صلاحية دخول لوحة التحكم." />;
  }

  return <Outlet />;
}
