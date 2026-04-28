import { History, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminActionButton from "../components/AdminActionButton";
import AdminCard from "../components/AdminCard";
import AdminEmptyState from "../components/AdminEmptyState";
import AdminErrorState from "../components/AdminErrorState";
import AdminFeatureUnavailable from "../components/AdminFeatureUnavailable";
import AdminLoadingState from "../components/AdminLoadingState";
import AdminPageHeader from "../components/AdminPageHeader";
import { useActiveRestaurantScope } from "../hooks/useActiveRestaurantScope";
import {
  AuditLogsRepositoryError,
  getAuditLogsByRestaurant,
} from "../../services/repositories/auditLogsRepository";
import type { AuditLog, AuditLogMetadataValue } from "../../types/platform";

const actionLabels: Record<string, string> = {
  activate: "تفعيل",
  contact_update: "تحديث بيانات التواصل",
  create: "إنشاء",
  deactivate: "إيقاف",
  delete: "حذف",
  hide: "إخفاء",
  settings_update: "تحديث الإعدادات",
  show: "إظهار",
  status_change: "تغيير الحالة",
  update: "تعديل",
  upload: "رفع صورة",
};

const entityLabels: Record<string, string> = {
  auth: "تسجيل الدخول",
  dish: "طبق",
  faq: "سؤال شائع",
  gallery: "المعرض",
  image: "صورة",
  offer: "عرض",
  order: "طلب",
  reservation: "حجز",
  settings: "الإعدادات",
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof AuditLogsRepositoryError) {
    return error.message;
  }

  return "تعذر تحميل سجل النشاط. تحقق من الاتصال أو صلاحيات Appwrite.";
};

const formatDate = (value: string | undefined) => {
  if (!value) {
    return "غير متوفر";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "غير متوفر";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatMetadataValue = (value: AuditLogMetadataValue) => {
  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }

  if (value === null) {
    return "فارغ";
  }

  return String(value);
};

const formatUser = (userId: string | undefined) => {
  if (!userId) {
    return "غير متوفر";
  }

  return `مستخدم ${userId.slice(-8)}`;
};

export default function AdminActivity() {
  const {
    activeRestaurant,
    activeRestaurantId,
    activeRestaurantName,
    canAccessFeature,
    canManageRestaurantContent,
    scopeError,
  } = useActiveRestaurantScope();
  const canUseActivity = canAccessFeature("canAccessActivityLogs");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    if (!canUseActivity || !activeRestaurantId) {
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const loadedLogs = await getAuditLogsByRestaurant(activeRestaurantId, 50);
      setLogs(loadedLogs);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId, canUseActivity]);

  useEffect(() => {
    if (!canManageRestaurantContent || !canUseActivity || !activeRestaurantId) {
      setLogs([]);
      return;
    }

    void loadLogs();
  }, [activeRestaurantId, canManageRestaurantContent, canUseActivity, loadLogs]);

  const renderMetadata = (log: AuditLog) => {
    const entries = Object.entries(log.metadata ?? {});

    if (entries.length === 0) {
      return <p className="admin-activity-card__empty-meta">لا توجد تفاصيل إضافية.</p>;
    }

    return (
      <div className="admin-activity-card__metadata" aria-label="تفاصيل مختصرة">
        {entries.slice(0, 6).map(([key, value]) => (
          <span key={key}>
            <strong>{key}</strong>
            {formatMetadataValue(value)}
          </span>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (scopeError) {
      return <AdminErrorState title="لا يمكن فتح سجل النشاط" message={scopeError} />;
    }

    if (!canUseActivity) {
      return <AdminFeatureUnavailable featureName="سجل النشاط" />;
    }

    if (isLoading) {
      return <AdminLoadingState label="جارٍ تحميل سجل النشاط..." />;
    }

    if (pageError) {
      return (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadLogs()}>
              إعادة المحاولة
            </AdminActionButton>
          }
        />
      );
    }

    if (logs.length === 0) {
      return (
        <AdminEmptyState
          icon={<History size={30} aria-hidden="true" />}
          title="لا توجد عمليات مسجلة بعد"
          body="ستظهر هنا آخر العمليات المهمة التي تمت داخل لوحة التحكم."
        />
      );
    }

    return (
      <div className="admin-activity-list">
        {logs.map((log) => (
          <AdminCard as="article" className="admin-activity-card" key={log.id}>
            <div className="admin-activity-card__main">
              <div className="admin-activity-card__icon">
                <History size={18} aria-hidden="true" />
              </div>
              <div>
                <h3>{actionLabels[log.action] ?? log.action}</h3>
                <p>{entityLabels[log.entityType] ?? log.entityType}</p>
              </div>
            </div>

            <div className="admin-activity-card__meta">
              <span>{formatDate(log.createdAt)}</span>
              <span>{formatUser(log.userId)}</span>
            </div>

            {renderMetadata(log)}
          </AdminCard>
        ))}
      </div>
    );
  };

  return (
    <section className="admin-activity-page">
      <AdminPageHeader
        eyebrow={activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name}
        title="سجل النشاط"
        description="راجع آخر العمليات التي تمت داخل لوحة التحكم."
        actions={
          canManageRestaurantContent && canUseActivity ? (
            <AdminActionButton
              variant="secondary"
              icon={<RefreshCw size={18} aria-hidden="true" />}
              onClick={() => void loadLogs()}
              disabled={isLoading}
            >
              تحديث السجل
            </AdminActionButton>
          ) : null
        }
      />

      {renderContent()}
    </section>
  );
}
