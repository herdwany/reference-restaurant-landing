import { CalendarCheck, Eye, MessageCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminActionButton from "../components/AdminActionButton";
import AdminCard from "../components/AdminCard";
import AdminEmptyState from "../components/AdminEmptyState";
import AdminErrorState from "../components/AdminErrorState";
import AdminFeatureUnavailable from "../components/AdminFeatureUnavailable";
import AdminFormModal from "../components/AdminFormModal";
import AdminLoadingState from "../components/AdminLoadingState";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminStatusBadge from "../components/AdminStatusBadge";
import { useActiveRestaurantScope } from "../hooks/useActiveRestaurantScope";
import { useAuditLogger } from "../hooks/useAuditLogger";
import { useI18n } from "../../lib/i18n/I18nContext";
import {
  ReservationsRepositoryError,
  getReservationById,
  getReservationsByRestaurant,
  updateReservationStatus,
} from "../../services/repositories/reservationsRepository";
import type { Reservation, ReservationStatus } from "../../types/platform";
import { createWhatsappUrl } from "../../utils/formatters";

type ReservationFilter = ReservationStatus | "all";
type StatusTone = "success" | "warning" | "neutral" | "danger";

const reservationStatuses = [
  "new",
  "pending_confirmation",
  "confirmed",
  "deposit_required",
  "deposit_paid",
  "seated",
  "completed",
  "no_show",
  "cancelled",
  "rejected",
] as const satisfies readonly ReservationStatus[];

const statusLabelKeys: Record<ReservationStatus, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  new: "reservationStatusNew",
  pending_confirmation: "reservationStatusPendingConfirmation",
  confirmed: "reservationStatusConfirmed",
  deposit_required: "reservationStatusDepositRequired",
  deposit_paid: "reservationStatusDepositPaid",
  seated: "reservationStatusSeated",
  completed: "reservationStatusCompleted",
  no_show: "reservationStatusNoShow",
  cancelled: "reservationStatusCancelled",
  rejected: "reservationStatusRejected",
};

const statusTones: Record<ReservationStatus, StatusTone> = {
  new: "neutral",
  pending_confirmation: "warning",
  confirmed: "success",
  deposit_required: "warning",
  deposit_paid: "success",
  seated: "neutral",
  completed: "success",
  no_show: "danger",
  cancelled: "danger",
  rejected: "danger",
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof ReservationsRepositoryError) {
    return error.message;
  }

  return "تعذر تنفيذ العملية. تحقق من الاتصال أو صلاحيات Appwrite.";
};

const formatReservationId = (reservationId: string) => `#${reservationId.slice(-6).toUpperCase()}`;

const formatCreatedAt = (value: string | undefined) => {
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

const formatReservationDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value || "غير متوفر";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
  }).format(date);
};

const formatReservationTime = (value: string) => {
  const date = new Date(`1970-01-01T${value}`);

  if (Number.isNaN(date.getTime())) {
    return value || "غير متوفر";
  }

  return new Intl.DateTimeFormat("ar", {
    timeStyle: "short",
  }).format(date);
};

export default function AdminReservations() {
  const { t } = useI18n();
  const {
    activeRestaurant,
    activeRestaurantId,
    activeRestaurantName,
    activeRestaurantSlug,
    canAccessFeature,
    canManageRestaurantContent,
    scopeError,
  } = useActiveRestaurantScope();
  const logAction = useAuditLogger();
  const canUseReservations = canAccessFeature("canManageReservations");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReservationFilter>("all");
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [reservationDetails, setReservationDetails] = useState<Reservation | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [busyReservationId, setBusyReservationId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      new: reservations.filter((reservation) => reservation.status === "new").length,
      confirmed: reservations.filter((reservation) => reservation.status === "confirmed").length,
      completed: reservations.filter((reservation) => reservation.status === "completed").length,
      depositRequired: reservations.filter((reservation) => reservation.status === "deposit_required").length,
    }),
    [reservations],
  );

  const filteredReservations = useMemo(() => {
    if (statusFilter === "all") {
      return reservations;
    }

    return reservations.filter((reservation) => reservation.status === statusFilter);
  }, [reservations, statusFilter]);

  const selectedReservation = useMemo(() => {
    if (!selectedReservationId) {
      return null;
    }

    return reservationDetails?.id === selectedReservationId
      ? reservationDetails
      : reservations.find((reservation) => reservation.id === selectedReservationId) ?? null;
  }, [reservationDetails, reservations, selectedReservationId]);

  const loadReservations = useCallback(async () => {
    if (!canUseReservations || !activeRestaurantId) {
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const loadedReservations = await getReservationsByRestaurant(activeRestaurantId);
      setReservations(loadedReservations);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId, canUseReservations]);

  useEffect(() => {
    if (!canManageRestaurantContent || !canUseReservations || !activeRestaurantId) {
      setReservations([]);
      setSelectedReservationId(null);
      setReservationDetails(null);
      return;
    }

    void loadReservations();
  }, [activeRestaurantId, canManageRestaurantContent, canUseReservations, loadReservations]);

  const loadReservationDetails = async (reservation: Reservation) => {
    if (!canUseReservations) {
      setPageError("هذه الميزة غير متاحة في باقتك الحالية. تواصل مع Pixel One لتفعيل هذه الميزة.");
      return;
    }

    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setSelectedReservationId(reservation.id);
    setReservationDetails(null);
    setIsDetailsLoading(true);
    setPageError(null);

    try {
      const details = await getReservationById(reservation.id, activeRestaurantId);

      if (!details) {
        setPageError("تعذر العثور على هذا الحجز داخل نطاق المطعم الحالي.");
        setSelectedReservationId(null);
        return;
      }

      setReservationDetails(details);
    } catch (error) {
      setPageError(getErrorMessage(error));
      setSelectedReservationId(null);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleStatusChange = async (reservation: Reservation, status: ReservationStatus) => {
    if (!canUseReservations) {
      setPageError("لا يمكن حفظ هذه التغييرات لأن الميزة غير مفعلة.");
      return;
    }

    if (reservation.status === status) {
      return;
    }

    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setBusyReservationId(reservation.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const updatedReservation = await updateReservationStatus(reservation.id, status, activeRestaurantId);
      setReservations((current) =>
        current.map((item) => (item.id === updatedReservation.id ? updatedReservation : item)),
      );
      setReservationDetails((current) => (current?.id === updatedReservation.id ? updatedReservation : current));
      logAction({
        action: "status_change",
        entityType: "reservation",
        entityId: updatedReservation.id,
        metadata: {
          reservationId: updatedReservation.id,
          fromStatus: reservation.status,
          toStatus: updatedReservation.status,
        },
      });
      setSuccessMessage("تم تحديث حالة الحجز بنجاح.");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyReservationId(null);
    }
  };

  const openWhatsappReply = (reservation: Reservation) => {
    const restaurantName = activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name || "المطعم";
    const trackUrl = activeRestaurantSlug ? `${window.location.origin}/r/${activeRestaurantSlug}/track` : "";
    const message = `مرحبًا ${reservation.customerName}، بخصوص حجزك في ${restaurantName} بتاريخ ${formatReservationDate(
      reservation.reservationDate,
    )} الساعة ${formatReservationTime(reservation.reservationTime)}، حالة الحجز الآن: ${t(statusLabelKeys[reservation.status])}.${
      reservation.trackingCode ? `\nرمز التتبع: ${reservation.trackingCode}` : ""
    }${trackUrl ? `\nرابط التتبع: ${trackUrl}` : ""}${
      reservation.depositStatus === "required" && reservation.depositAmount
        ? `\nالعربون المطلوب: ${reservation.depositAmount} د.م.`
        : ""
    }`;

    window.open(createWhatsappUrl(reservation.customerPhone, message), "_blank", "noopener,noreferrer");
  };

  const closeDetails = () => {
    if (busyReservationId) {
      return;
    }

    setSelectedReservationId(null);
    setReservationDetails(null);
  };

  const renderReservationCard = (reservation: Reservation) => (
    <AdminCard as="article" className="admin-order-card" key={reservation.id}>
      <div className="admin-order-card__header">
        <div>
          <span>{formatReservationId(reservation.id)}</span>
          <h3>{reservation.customerName}</h3>
        </div>
        <AdminStatusBadge tone={statusTones[reservation.status]}>{t(statusLabelKeys[reservation.status])}</AdminStatusBadge>
      </div>

      <div className="admin-order-card__meta">
        <div>
          <span>{t("trackingCode")}</span>
          <strong>{reservation.trackingCode || formatReservationId(reservation.id)}</strong>
        </div>
        <div>
          <span>الهاتف</span>
          <strong>{reservation.customerPhone}</strong>
        </div>
        <div>
          <span>التاريخ</span>
          <strong>{formatReservationDate(reservation.reservationDate)}</strong>
        </div>
        <div>
          <span>الوقت</span>
          <strong>{formatReservationTime(reservation.reservationTime)}</strong>
        </div>
        <div>
          <span>عدد الأشخاص</span>
          <strong>{reservation.peopleCount}</strong>
        </div>
        <div>
          <span>الحالة</span>
          <strong>{t(statusLabelKeys[reservation.status])}</strong>
        </div>
        <div>
          <span>العربون</span>
          <strong>
            {reservation.depositStatus || "none"}
            {reservation.depositAmount ? ` - ${reservation.depositAmount} د.م` : ""}
          </strong>
        </div>
        <div>
          <span>تاريخ الإنشاء</span>
          <strong>{formatCreatedAt(reservation.createdAt)}</strong>
        </div>
      </div>

      <label className="admin-order-card__status">
        <span>تغيير الحالة</span>
        <select
          value={reservation.status}
          onChange={(event) => void handleStatusChange(reservation, event.target.value as ReservationStatus)}
          disabled={busyReservationId === reservation.id}
        >
          {reservationStatuses.map((status) => (
            <option value={status} key={status}>
              {t(statusLabelKeys[status])}
            </option>
          ))}
        </select>
      </label>

      <div className="admin-order-card__actions">
        <AdminActionButton
          variant="secondary"
          icon={<Eye size={17} aria-hidden="true" />}
          onClick={() => void loadReservationDetails(reservation)}
        >
          عرض التفاصيل
        </AdminActionButton>
        <AdminActionButton
          variant="primary"
          icon={<MessageCircle size={17} aria-hidden="true" />}
          onClick={() => openWhatsappReply(reservation)}
        >
          الرد عبر واتساب
        </AdminActionButton>
      </div>
    </AdminCard>
  );

  const renderContent = () => {
    if (scopeError) {
      return <AdminErrorState title="لا يمكن فتح الحجوزات" message={scopeError} />;
    }

    if (!canUseReservations) {
      return <AdminFeatureUnavailable featureName="الحجوزات" />;
    }

    if (isLoading) {
      return <AdminLoadingState label="جارٍ تحميل الحجوزات..." />;
    }

    if (pageError) {
      return (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadReservations()}>
              إعادة المحاولة
            </AdminActionButton>
          }
        />
      );
    }

    if (reservations.length === 0) {
      return (
        <AdminEmptyState
          icon={<CalendarCheck size={30} aria-hidden="true" />}
          title="لا توجد حجوزات بعد"
          body="ستظهر حجوزات الطاولات الواردة من الموقع هنا بعد إرسال العميل لنموذج الحجز."
        />
      );
    }

    if (filteredReservations.length === 0) {
      return (
        <AdminEmptyState
          icon={<CalendarCheck size={30} aria-hidden="true" />}
          title="لا توجد حجوزات بهذه الحالة"
          body="غيّر الفلتر لعرض حالات أخرى."
        />
      );
    }

    return <div className="admin-orders-grid">{filteredReservations.map(renderReservationCard)}</div>;
  };

  return (
    <section className="admin-orders-page admin-reservations-page">
      <AdminPageHeader
        eyebrow={activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name}
        title="الحجوزات"
        description="تابع حجوزات الطاولات الواردة من موقع مطعمك."
        actions={
          canManageRestaurantContent && canUseReservations ? (
            <AdminActionButton
              variant="secondary"
              icon={<RefreshCw size={18} aria-hidden="true" />}
              onClick={() => void loadReservations()}
              disabled={isLoading}
            >
              تحديث الحجوزات
            </AdminActionButton>
          ) : null
        }
      />

      {canManageRestaurantContent && canUseReservations && reservations.length > 0 ? (
        <>
          <div className="admin-orders-stats" aria-label="ملخص الحجوزات">
            <div>
              <span>جديد</span>
              <strong>{stats.new}</strong>
            </div>
            <div>
              <span>مؤكد</span>
              <strong>{stats.confirmed}</strong>
            </div>
            <div>
              <span>مكتمل</span>
              <strong>{stats.completed}</strong>
            </div>
            <div>
              <span>{t("reservationStatusDepositRequired")}</span>
              <strong>{stats.depositRequired}</strong>
            </div>
          </div>

          <div className="admin-orders-filters" aria-label="تصفية الحجوزات حسب الحالة">
            {(["all", ...reservationStatuses] as const).map((filter) => (
              <button
                className={filter === statusFilter ? "is-active" : ""}
                type="button"
                onClick={() => setStatusFilter(filter)}
                key={filter}
              >
                {filter === "all" ? t("all") : t(statusLabelKeys[filter])}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {successMessage ? <div className="admin-feedback admin-feedback--success">{successMessage}</div> : null}

      {renderContent()}

      <AdminFormModal
        isOpen={Boolean(selectedReservationId)}
        title={selectedReservation ? `تفاصيل الحجز ${formatReservationId(selectedReservation.id)}` : "تفاصيل الحجز"}
        description="معلومات العميل وموعد الحجز وحالته الحالية."
        onClose={closeDetails}
        size="lg"
      >
        {isDetailsLoading ? <AdminLoadingState label="جارٍ تحميل تفاصيل الحجز..." /> : null}

        {!isDetailsLoading && reservationDetails ? (
          <div className="admin-order-details">
            <div className="admin-order-details__grid">
              <div>
                <span>العميل</span>
                <strong>{reservationDetails.customerName}</strong>
              </div>
              <div>
                <span>الهاتف</span>
                <strong>{reservationDetails.customerPhone}</strong>
              </div>
              <div>
                <span>التاريخ</span>
                <strong>{formatReservationDate(reservationDetails.reservationDate)}</strong>
              </div>
              <div>
                <span>الوقت</span>
                <strong>{formatReservationTime(reservationDetails.reservationTime)}</strong>
              </div>
              <div>
                <span>عدد الأشخاص</span>
                <strong>{reservationDetails.peopleCount}</strong>
              </div>
              <div>
                <span>الحالة</span>
                <AdminStatusBadge tone={statusTones[reservationDetails.status]}>
                  {t(statusLabelKeys[reservationDetails.status])}
                </AdminStatusBadge>
              </div>
              <div>
                <span>{t("trackingCode")}</span>
                <strong>{reservationDetails.trackingCode || formatReservationId(reservationDetails.id)}</strong>
              </div>
              <div>
                <span>العربون</span>
                <strong>
                  {reservationDetails.depositStatus || "none"}
                  {reservationDetails.depositAmount ? ` - ${reservationDetails.depositAmount} د.م` : ""}
                </strong>
              </div>
            </div>

            <div className="admin-order-details__notes">
              <span>الملاحظات</span>
              <p>{reservationDetails.notes || "لا توجد ملاحظات."}</p>
            </div>

            <div className="admin-order-status-actions admin-reservation-status-actions">
              {reservationStatuses.map((status) => (
                <AdminActionButton
                  variant={status === reservationDetails.status ? "primary" : "secondary"}
                  onClick={() => void handleStatusChange(reservationDetails, status)}
                  disabled={busyReservationId === reservationDetails.id}
                  key={status}
                >
                  {t(statusLabelKeys[status])}
                </AdminActionButton>
              ))}
            </div>

            <div className="admin-order-details__actions">
              <AdminActionButton
                variant="primary"
                icon={<MessageCircle size={17} aria-hidden="true" />}
                onClick={() => openWhatsappReply(reservationDetails)}
              >
                الرد عبر واتساب
              </AdminActionButton>
            </div>
          </div>
        ) : null}
      </AdminFormModal>
    </section>
  );
}
