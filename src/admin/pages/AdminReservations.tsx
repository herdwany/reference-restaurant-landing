import { Archive, CalendarCheck, Eye, MessageCircle, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminActionButton from "../components/AdminActionButton";
import AdminCard from "../components/AdminCard";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import AdminEmptyState from "../components/AdminEmptyState";
import AdminErrorState from "../components/AdminErrorState";
import AdminFeatureUnavailable from "../components/AdminFeatureUnavailable";
import AdminFormModal from "../components/AdminFormModal";
import AdminLoadingState from "../components/AdminLoadingState";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminStatusBadge from "../components/AdminStatusBadge";
import { useActiveRestaurantScope } from "../hooks/useActiveRestaurantScope";
import { useAuditLogger } from "../hooks/useAuditLogger";
import { mapKnownErrorToFriendlyMessage } from "../../lib/friendlyErrors";
import { useI18n } from "../../lib/i18n/I18nContext";
import {
  archiveReservation,
  getArchivedReservationsByRestaurant,
  getReservationById,
  getReservationsByRestaurant,
  restoreReservation,
  updateReservationStatus,
} from "../../services/repositories/reservationsRepository";
import { getSiteSettings } from "../../services/repositories/settingsRepository";
import type { Reservation, ReservationStatus } from "../../types/platform";
import { createWhatsappUrl, formatPrice } from "../../utils/formatters";

type ReservationFilter = ReservationStatus | "all";
type ReservationView = "upcoming" | "past" | "archive";
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
const archivableReservationStatuses = ["completed", "no_show", "cancelled", "rejected"] as const satisfies readonly ReservationStatus[];
const reviewReservationStatuses = ["new", "pending_confirmation", "confirmed", "deposit_required"] as const satisfies readonly ReservationStatus[];
const defaultReservationArchivePreferences = {
  enableManualArchiveActions: true,
  showPastReservationsInSeparateTab: true,
};
const reservationViewLabelKeys: Record<ReservationView, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  upcoming: "upcomingReservations",
  past: "pastReservations",
  archive: "archivedReservations",
};

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

const depositStatusLabelKeys: Record<string, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  none: "depositStatusNone",
  paid: "depositStatusPaid",
  required: "depositStatusRequired",
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

const getErrorMessage = (error: unknown, t: ReturnType<typeof useI18n>["t"]) => mapKnownErrorToFriendlyMessage(error, t);

const formatReservationId = (reservationId: string) => `#${reservationId.slice(-6).toUpperCase()}`;

const formatCreatedAt = (value: string | undefined, language: string, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatReservationDate = (value: string, language: string, fallback: string) => {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value || fallback;
  }

  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
  }).format(date);
};

const formatReservationTime = (value: string, language: string, fallback: string) => {
  const date = new Date(`1970-01-01T${value}`);

  if (Number.isNaN(date.getTime())) {
    return value || fallback;
  }

  return new Intl.DateTimeFormat(language, {
    timeStyle: "short",
  }).format(date);
};

const getReservationDateTime = (reservation: Reservation) => {
  const date = new Date(`${reservation.reservationDate}T${reservation.reservationTime || "00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isPastReservation = (reservation: Reservation) => {
  const date = getReservationDateTime(reservation);
  return date ? date.getTime() < Date.now() : false;
};

export default function AdminReservations() {
  const { currentLanguage, t } = useI18n();
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
  const [reservationView, setReservationView] = useState<ReservationView>("upcoming");
  const [statusFilter, setStatusFilter] = useState<ReservationFilter>("all");
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [reservationDetails, setReservationDetails] = useState<Reservation | null>(null);
  const [pendingArchiveReservation, setPendingArchiveReservation] = useState<Reservation | null>(null);
  const [archivePreferences, setArchivePreferences] = useState(defaultReservationArchivePreferences);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [busyReservationId, setBusyReservationId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isArchiveView = reservationView === "archive";
  const canUseManualArchiveActions = canUseReservations && archivePreferences.enableManualArchiveActions;
  const canArchiveReservationRecord = (reservation: Reservation) =>
    (archivableReservationStatuses as readonly ReservationStatus[]).includes(reservation.status);
  const needsReview = (reservation: Reservation) =>
    isPastReservation(reservation) && (reviewReservationStatuses as readonly ReservationStatus[]).includes(reservation.status);

  const stats = useMemo(
    () => ({
      new: reservations.filter((reservation) => reservation.status === "new").length,
      confirmed: reservations.filter((reservation) => reservation.status === "confirmed").length,
      completed: reservations.filter((reservation) => reservation.status === "completed").length,
      depositRequired: reservations.filter((reservation) => reservation.status === "deposit_required").length,
      needsReview: reservations.filter(needsReview).length,
    }),
    [reservations],
  );
  const completedArchiveCandidatesCount = useMemo(
    () => reservations.filter(canArchiveReservationRecord).length,
    [reservations],
  );

  const viewReservations = useMemo(() => {
    if (reservationView === "archive") {
      return reservations;
    }

    if (reservationView === "past") {
      return archivePreferences.showPastReservationsInSeparateTab ? reservations.filter(isPastReservation) : reservations.filter(needsReview);
    }

    return archivePreferences.showPastReservationsInSeparateTab ? reservations.filter((reservation) => !isPastReservation(reservation)) : reservations;
  }, [archivePreferences.showPastReservationsInSeparateTab, reservationView, reservations]);

  const filteredReservations = useMemo(() => {
    if (statusFilter === "all") {
      return viewReservations;
    }

    return viewReservations.filter((reservation) => reservation.status === statusFilter);
  }, [statusFilter, viewReservations]);

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
      const [loadedReservations, settings] = await Promise.all([
        reservationView === "archive" ? getArchivedReservationsByRestaurant(activeRestaurantId) : getReservationsByRestaurant(activeRestaurantId),
        getSiteSettings(activeRestaurantId).catch(() => null),
      ]);
      setReservations(loadedReservations);
      setArchivePreferences({
        enableManualArchiveActions:
          settings?.enableManualArchiveActions ?? defaultReservationArchivePreferences.enableManualArchiveActions,
        showPastReservationsInSeparateTab:
          settings?.showPastReservationsInSeparateTab ?? defaultReservationArchivePreferences.showPastReservationsInSeparateTab,
      });
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId, canUseReservations, reservationView, t]);

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
      setPageError(t("featureUnavailable"));
      return;
    }

    if (!activeRestaurantId) {
      setPageError(t("restaurantScopeMissing"));
      return;
    }

    setSelectedReservationId(reservation.id);
    setReservationDetails(null);
    setIsDetailsLoading(true);
    setPageError(null);

    try {
      const details = await getReservationById(reservation.id, activeRestaurantId);

      if (!details) {
        setPageError(t("operationFailed"));
        setSelectedReservationId(null);
        return;
      }

      setReservationDetails(details);
    } catch (error) {
      setPageError(getErrorMessage(error, t));
      setSelectedReservationId(null);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleStatusChange = async (reservation: Reservation, status: ReservationStatus) => {
    if (reservation.isArchived) {
      setPageError(t("cannotChangeArchivedReservation"));
      return;
    }

    if (!canUseReservations) {
      setPageError(t("featureUnavailable"));
      return;
    }

    if (reservation.status === status) {
      return;
    }

    if (!activeRestaurantId) {
      setPageError(t("restaurantScopeMissing"));
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
      setSuccessMessage(t("reservationStatusUpdatedSuccess"));
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setBusyReservationId(null);
    }
  };

  const handleArchiveReservation = async () => {
    if (!pendingArchiveReservation || !activeRestaurantId) {
      return;
    }

    setBusyReservationId(pendingArchiveReservation.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const archivedReservation = await archiveReservation(pendingArchiveReservation.id, activeRestaurantId);
      setReservations((current) => current.filter((item) => item.id !== archivedReservation.id));
      setReservationDetails((current) => (current?.id === archivedReservation.id ? null : current));
      setSelectedReservationId((current) => (current === archivedReservation.id ? null : current));
      logAction({
        action: "archive",
        entityType: "reservation",
        entityId: archivedReservation.id,
        metadata: {
          reservationId: archivedReservation.id,
          status: archivedReservation.status,
        },
      });
      setSuccessMessage(t("reservationArchivedSuccess"));
      setPendingArchiveReservation(null);
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setBusyReservationId(null);
    }
  };

  const handleRestoreReservation = async (reservation: Reservation) => {
    if (!activeRestaurantId) {
      setPageError(t("restaurantScopeMissing"));
      return;
    }

    setBusyReservationId(reservation.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const restoredReservation = await restoreReservation(reservation.id, activeRestaurantId);
      setReservations((current) =>
        isArchiveView
          ? current.filter((item) => item.id !== restoredReservation.id)
          : current.map((item) => (item.id === restoredReservation.id ? restoredReservation : item)),
      );
      setReservationDetails((current) => (current?.id === restoredReservation.id ? restoredReservation : current));
      logAction({
        action: "restore",
        entityType: "reservation",
        entityId: restoredReservation.id,
        metadata: {
          reservationId: restoredReservation.id,
          status: restoredReservation.status,
        },
      });
      setSuccessMessage(t("reservationRestoredSuccess"));
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setBusyReservationId(null);
    }
  };

  const handleArchiveCompletedReservations = async () => {
    if (!activeRestaurantId) {
      setPageError(t("restaurantScopeMissing"));
      return;
    }

    const candidates = reservations.filter(canArchiveReservationRecord);

    if (candidates.length === 0) {
      setSuccessMessage(t("noReservationsForFilter"));
      return;
    }

    setBusyReservationId("bulk-archive");
    setPageError(null);
    setSuccessMessage(null);

    try {
      const archivedReservations = await Promise.all(
        candidates.map((reservation) => archiveReservation(reservation.id, activeRestaurantId, "bulk_completed_reservations_archive")),
      );
      const archivedIds = new Set(archivedReservations.map((reservation) => reservation.id));
      setReservations((current) => current.filter((reservation) => !archivedIds.has(reservation.id)));
      archivedReservations.forEach((reservation) => {
        logAction({
          action: "archive",
          entityType: "reservation",
          entityId: reservation.id,
          metadata: {
            reservationId: reservation.id,
            status: reservation.status,
            bulk: true,
          },
        });
      });
      setSuccessMessage(t("reservationArchivedSuccess"));
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setBusyReservationId(null);
    }
  };

  const openWhatsappReply = (reservation: Reservation) => {
    const restaurantName = activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name || t("restaurantFallbackName");
    const trackUrl = activeRestaurantSlug ? `${window.location.origin}/r/${activeRestaurantSlug}/track` : "";
    const message = [
      t("whatsappReservationGreeting")
        .replace("{customerName}", reservation.customerName)
        .replace("{restaurantName}", restaurantName)
        .replace("{date}", formatReservationDate(reservation.reservationDate, currentLanguage, t("notAvailable")))
        .replace("{time}", formatReservationTime(reservation.reservationTime, currentLanguage, t("notAvailable"))),
      t("whatsappStatusLine").replace("{status}", t(statusLabelKeys[reservation.status])),
      reservation.trackingCode ? t("whatsappTrackingCodeLine").replace("{trackingCode}", reservation.trackingCode) : null,
      trackUrl ? t("whatsappTrackingLinkLine").replace("{trackUrl}", trackUrl) : null,
      reservation.depositStatus === "required" && reservation.depositAmount
        ? `${t("depositAmount")}: ${formatPrice(reservation.depositAmount, "MAD")}.`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

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
        <div className="admin-order-card__badges">
          <AdminStatusBadge tone={statusTones[reservation.status]}>{t(statusLabelKeys[reservation.status])}</AdminStatusBadge>
          {needsReview(reservation) ? <AdminStatusBadge tone="warning">{t("needsReview")}</AdminStatusBadge> : null}
        </div>
      </div>

      <div className="admin-order-card__meta">
        <div>
          <span>{t("trackingCode")}</span>
          <strong>{reservation.trackingCode || formatReservationId(reservation.id)}</strong>
        </div>
        <div>
          <span>{t("customerPhone")}</span>
          <strong>{reservation.customerPhone}</strong>
        </div>
        <div>
          <span>{t("reservationDate")}</span>
          <strong>{formatReservationDate(reservation.reservationDate, currentLanguage, t("notAvailable"))}</strong>
        </div>
        <div>
          <span>{t("reservationTime")}</span>
          <strong>{formatReservationTime(reservation.reservationTime, currentLanguage, t("notAvailable"))}</strong>
        </div>
        <div>
          <span>{t("peopleCount")}</span>
          <strong>{reservation.peopleCount}</strong>
        </div>
        <div>
          <span>{t("status")}</span>
          <strong>{t(statusLabelKeys[reservation.status])}</strong>
        </div>
        <div>
          <span>{t("deposit")}</span>
          <strong>
            {t(depositStatusLabelKeys[reservation.depositStatus || "none"] ?? "depositStatusNone")}
            {reservation.depositAmount ? ` - ${formatPrice(reservation.depositAmount, "MAD")}` : ""}
          </strong>
        </div>
        <div>
          <span>{t("createdAt")}</span>
          <strong>{formatCreatedAt(reservation.createdAt, currentLanguage, t("notAvailable"))}</strong>
        </div>
      </div>

      {isArchiveView ? (
        <div className="admin-feedback admin-feedback--warning">{t("cannotChangeArchivedReservation")}</div>
      ) : (
        <label className="admin-order-card__status">
          <span>{t("changeStatus")}</span>
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
      )}

      <div className="admin-order-card__actions">
        <AdminActionButton
          variant="secondary"
          icon={<Eye size={17} aria-hidden="true" />}
          onClick={() => void loadReservationDetails(reservation)}
        >
          {t("view")}
        </AdminActionButton>
        {isArchiveView ? (
          canUseManualArchiveActions ? (
            <AdminActionButton
              variant="primary"
              icon={<RotateCcw size={17} aria-hidden="true" />}
              onClick={() => void handleRestoreReservation(reservation)}
              disabled={busyReservationId === reservation.id}
            >
              {t("restore")}
            </AdminActionButton>
          ) : null
        ) : (
          <>
            <AdminActionButton
              variant="primary"
              icon={<MessageCircle size={17} aria-hidden="true" />}
              onClick={() => openWhatsappReply(reservation)}
            >
              {t("replyWhatsapp")}
            </AdminActionButton>
            {canUseManualArchiveActions && canArchiveReservationRecord(reservation) ? (
              <AdminActionButton
                variant="secondary"
                icon={<Archive size={17} aria-hidden="true" />}
                onClick={() => setPendingArchiveReservation(reservation)}
                disabled={busyReservationId === reservation.id}
              >
                {t("archive")}
              </AdminActionButton>
            ) : null}
          </>
        )}
      </div>
    </AdminCard>
  );

  const renderContent = () => {
    if (scopeError) {
      return <AdminErrorState title={t("reservationsTitle")} message={scopeError} />;
    }

    if (!canUseReservations) {
      return <AdminFeatureUnavailable featureName={t("reservations")} />;
    }

    if (isLoading) {
      return <AdminLoadingState label={t("loading")} />;
    }

    if (pageError) {
      return (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadReservations()}>
              {t("tryAgain")}
            </AdminActionButton>
          }
        />
      );
    }

    if (reservations.length === 0) {
      return (
        <AdminEmptyState
          icon={<CalendarCheck size={30} aria-hidden="true" />}
          title={t("noReservationsYet")}
          body={t("noData")}
        />
      );
    }

    if (filteredReservations.length === 0) {
      return (
        <AdminEmptyState
          icon={<CalendarCheck size={30} aria-hidden="true" />}
          title={t("noReservationsForFilter")}
          body={t("noData")}
        />
      );
    }

    return <div className="admin-orders-grid">{filteredReservations.map(renderReservationCard)}</div>;
  };

  return (
    <section className="admin-orders-page admin-reservations-page">
      <AdminPageHeader
        eyebrow={activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name}
        title={t("reservationsTitle")}
        description={t("reservationsDescription")}
        actions={
          canManageRestaurantContent && canUseReservations ? (
            <>
              {canUseManualArchiveActions && !isArchiveView && completedArchiveCandidatesCount > 0 ? (
                <AdminActionButton
                  variant="secondary"
                  icon={<Archive size={18} aria-hidden="true" />}
                  onClick={() => void handleArchiveCompletedReservations()}
                  disabled={isLoading || busyReservationId === "bulk-archive"}
                >
                  {t("archiveCompletedReservations")}
                </AdminActionButton>
              ) : null}
              <AdminActionButton
                variant="secondary"
                icon={<RefreshCw size={18} aria-hidden="true" />}
                onClick={() => void loadReservations()}
                disabled={isLoading}
              >
                {t("refresh")}
              </AdminActionButton>
            </>
          ) : null
        }
      />

      {canManageRestaurantContent && canUseReservations ? (
        <>
          <div className="admin-orders-stats" aria-label={t("reservationsTitle")}>
            <div>
              <span>{t("reservationStatusNew")}</span>
              <strong>{stats.new}</strong>
            </div>
            <div>
              <span>{t("reservationStatusConfirmed")}</span>
              <strong>{stats.confirmed}</strong>
            </div>
            <div>
              <span>{t("reservationStatusCompleted")}</span>
              <strong>{stats.completed}</strong>
            </div>
            <div>
              <span>{t("needsReview")}</span>
              <strong>{stats.needsReview}</strong>
            </div>
          </div>

          <div className="admin-orders-filters" aria-label={t("reservationsTitle")}>
            {(["upcoming", "past", "archive"] as const).map((view) => (
              <button
                className={view === reservationView ? "is-active" : ""}
                type="button"
                onClick={() => {
                  setReservationView(view);
                  setStatusFilter("all");
                }}
                key={view}
              >
                {t(reservationViewLabelKeys[view])}
              </button>
            ))}
          </div>

          <div className="admin-orders-filters" aria-label={t("changeStatus")}>
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
        title={selectedReservation ? `${t("reservationDetails")} ${formatReservationId(selectedReservation.id)}` : t("reservationDetails")}
        description={t("reservationsDescription")}
        onClose={closeDetails}
        size="lg"
      >
        {isDetailsLoading ? <AdminLoadingState label={t("loading")} /> : null}

        {!isDetailsLoading && reservationDetails ? (
          <div className="admin-order-details">
            <div className="admin-order-details__grid">
              <div>
                <span>{t("customer")}</span>
                <strong>{reservationDetails.customerName}</strong>
              </div>
              <div>
                <span>{t("customerPhone")}</span>
                <strong>{reservationDetails.customerPhone}</strong>
              </div>
              <div>
                <span>{t("reservationDate")}</span>
                <strong>{formatReservationDate(reservationDetails.reservationDate, currentLanguage, t("notAvailable"))}</strong>
              </div>
              <div>
                <span>{t("reservationTime")}</span>
                <strong>{formatReservationTime(reservationDetails.reservationTime, currentLanguage, t("notAvailable"))}</strong>
              </div>
              <div>
                <span>{t("peopleCount")}</span>
                <strong>{reservationDetails.peopleCount}</strong>
              </div>
              <div>
                <span>{t("status")}</span>
                <div className="admin-order-card__badges">
                  <AdminStatusBadge tone={statusTones[reservationDetails.status]}>
                    {t(statusLabelKeys[reservationDetails.status])}
                  </AdminStatusBadge>
                  {needsReview(reservationDetails) ? <AdminStatusBadge tone="warning">{t("needsReview")}</AdminStatusBadge> : null}
                </div>
              </div>
              <div>
                <span>{t("trackingCode")}</span>
                <strong>{reservationDetails.trackingCode || formatReservationId(reservationDetails.id)}</strong>
              </div>
              <div>
                <span>{t("deposit")}</span>
                <strong>
                  {t(depositStatusLabelKeys[reservationDetails.depositStatus || "none"] ?? "depositStatusNone")}
                  {reservationDetails.depositAmount ? ` - ${formatPrice(reservationDetails.depositAmount, "MAD")}` : ""}
                </strong>
              </div>
            </div>

            <div className="admin-order-details__notes">
              <span>{t("notes")}</span>
              <p>{reservationDetails.notes || t("noData")}</p>
            </div>

            {reservationDetails.isArchived ? (
              <div className="admin-feedback admin-feedback--warning">{t("cannotChangeArchivedReservation")}</div>
            ) : (
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
            )}

            <div className="admin-order-details__actions">
              {reservationDetails.isArchived ? (
                canUseManualArchiveActions ? (
                  <AdminActionButton
                    variant="primary"
                    icon={<RotateCcw size={17} aria-hidden="true" />}
                    onClick={() => void handleRestoreReservation(reservationDetails)}
                    disabled={busyReservationId === reservationDetails.id}
                  >
                    {t("restore")}
                  </AdminActionButton>
                ) : null
              ) : (
                <>
                  <AdminActionButton
                    variant="primary"
                    icon={<MessageCircle size={17} aria-hidden="true" />}
                    onClick={() => openWhatsappReply(reservationDetails)}
                  >
                    {t("replyWhatsapp")}
                  </AdminActionButton>
                  {canUseManualArchiveActions && canArchiveReservationRecord(reservationDetails) ? (
                    <AdminActionButton
                      variant="secondary"
                      icon={<Archive size={17} aria-hidden="true" />}
                      onClick={() => setPendingArchiveReservation(reservationDetails)}
                      disabled={busyReservationId === reservationDetails.id}
                    >
                      {t("archive")}
                    </AdminActionButton>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </AdminFormModal>

      <AdminConfirmDialog
        isOpen={Boolean(pendingArchiveReservation)}
        title={t("archiveReservation")}
        message={t("thisWillNotDeleteData")}
        confirmLabel={t("archive")}
        isSubmitting={Boolean(pendingArchiveReservation && busyReservationId === pendingArchiveReservation.id)}
        onCancel={() => {
          if (!busyReservationId) {
            setPendingArchiveReservation(null);
          }
        }}
        onConfirm={() => void handleArchiveReservation()}
      />
    </section>
  );
}
