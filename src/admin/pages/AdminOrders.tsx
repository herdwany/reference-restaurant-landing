import { Archive, Eye, MessageCircle, RefreshCw, RotateCcw, ShoppingBag } from "lucide-react";
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
import { useI18n } from "../../lib/i18n/I18nContext";
import {
  OrdersRepositoryError,
  archiveOrder,
  getArchivedOrdersByRestaurant,
  getOrderItems,
  getOrderWithItems,
  getOrdersByRestaurant,
  restoreOrder,
  updateOrderStatus,
  type OrderWithItems,
} from "../../services/repositories/ordersRepository";
import { getSiteSettings } from "../../services/repositories/settingsRepository";
import type { Order, OrderItem, OrderStatus } from "../../types/platform";
import { createWhatsappUrl, formatPrice } from "../../utils/formatters";

type OrderFilter = OrderStatus | "all";
type OrderView = "current" | "terminal" | "archive";
type StatusTone = "success" | "warning" | "neutral" | "danger";

const adminCurrency = "ر.س";
const orderStatuses = [
  "new",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
  "rejected",
] as const satisfies readonly OrderStatus[];
const terminalOrderStatuses = ["completed", "cancelled", "rejected"] as const satisfies readonly OrderStatus[];
const defaultOrderArchivePreferences = {
  enableManualArchiveActions: true,
  hideCompletedOrdersFromMainList: true,
  hideCancelledOrdersFromMainList: true,
};
const orderViewLabels: Record<OrderView, string> = {
  current: "الطلبات الحالية",
  terminal: "المكتملة/الملغاة",
  archive: "الأرشيف",
};

const statusLabelKeys: Record<OrderStatus, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  new: "orderStatusNew",
  confirmed: "orderStatusConfirmed",
  preparing: "orderStatusPreparing",
  ready: "orderStatusReady",
  out_for_delivery: "orderStatusOutForDelivery",
  completed: "orderStatusCompleted",
  cancelled: "orderStatusCancelled",
  rejected: "orderStatusRejected",
};

const statusTones: Record<OrderStatus, StatusTone> = {
  new: "neutral",
  confirmed: "neutral",
  preparing: "warning",
  ready: "success",
  out_for_delivery: "warning",
  completed: "success",
  cancelled: "danger",
  rejected: "danger",
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof OrdersRepositoryError) {
    return error.message;
  }

  return "تعذر تنفيذ العملية. تحقق من الاتصال أو صلاحيات Appwrite.";
};

const formatOrderId = (orderId: string) => `#${orderId.slice(-6).toUpperCase()}`;

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

const getItemsQuantity = (items: readonly OrderItem[]) => items.reduce((total, item) => total + item.quantity, 0);

export default function AdminOrders() {
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
  const canUseOrders = canAccessFeature("canManageOrders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [orderView, setOrderView] = useState<OrderView>("current");
  const [statusFilter, setStatusFilter] = useState<OrderFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderWithItems | null>(null);
  const [pendingArchiveOrder, setPendingArchiveOrder] = useState<Order | null>(null);
  const [archivePreferences, setArchivePreferences] = useState(defaultOrderArchivePreferences);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isArchiveView = orderView === "archive";
  const canUseManualArchiveActions = canUseOrders && archivePreferences.enableManualArchiveActions;
  const canArchiveOrderRecord = (order: Order) => (terminalOrderStatuses as readonly OrderStatus[]).includes(order.status);

  const stats = useMemo(
    () => ({
      new: orders.filter((order) => order.status === "new").length,
      preparing: orders.filter((order) => order.status === "preparing").length,
      ready: orders.filter((order) => order.status === "ready").length,
      completed: orders.filter((order) => order.status === "completed").length,
    }),
    [orders],
  );

  const viewOrders = useMemo(() => {
    if (orderView === "archive") {
      return orders;
    }

    if (orderView === "terminal") {
      return orders.filter(canArchiveOrderRecord);
    }

    return orders.filter((order) => {
      if (order.status === "completed") {
        return !archivePreferences.hideCompletedOrdersFromMainList;
      }

      if (order.status === "cancelled" || order.status === "rejected") {
        return !archivePreferences.hideCancelledOrdersFromMainList;
      }

      return true;
    });
  }, [archivePreferences.hideCancelledOrdersFromMainList, archivePreferences.hideCompletedOrdersFromMainList, orderView, orders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") {
      return viewOrders;
    }

    return viewOrders.filter((order) => order.status === statusFilter);
  }, [statusFilter, viewOrders]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return null;
    }

    return orderDetails?.order.id === selectedOrderId ? orderDetails.order : orders.find((order) => order.id === selectedOrderId) ?? null;
  }, [orderDetails, orders, selectedOrderId]);

  const loadOrders = useCallback(async () => {
    if (!canUseOrders || !activeRestaurantId) {
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const [loadedOrders, settings] = await Promise.all([
        orderView === "archive" ? getArchivedOrdersByRestaurant(activeRestaurantId) : getOrdersByRestaurant(activeRestaurantId),
        getSiteSettings(activeRestaurantId).catch(() => null),
      ]);
      const itemCountPairs = await Promise.all(
        loadedOrders.map(async (order) => {
          const items = await getOrderItems(order.id, activeRestaurantId);
          return [order.id, getItemsQuantity(items)] as const;
        }),
      );

      setOrders(loadedOrders);
      setArchivePreferences({
        enableManualArchiveActions: settings?.enableManualArchiveActions ?? defaultOrderArchivePreferences.enableManualArchiveActions,
        hideCompletedOrdersFromMainList:
          settings?.hideCompletedOrdersFromMainList ?? defaultOrderArchivePreferences.hideCompletedOrdersFromMainList,
        hideCancelledOrdersFromMainList:
          settings?.hideCancelledOrdersFromMainList ?? defaultOrderArchivePreferences.hideCancelledOrdersFromMainList,
      });
      setItemCounts(Object.fromEntries(itemCountPairs));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId, canUseOrders, orderView]);

  useEffect(() => {
    if (!canManageRestaurantContent || !canUseOrders || !activeRestaurantId) {
      setOrders([]);
      setItemCounts({});
      return;
    }

    void loadOrders();
  }, [activeRestaurantId, canManageRestaurantContent, canUseOrders, loadOrders]);

  const loadOrderDetails = async (order: Order) => {
    if (!canUseOrders) {
      setPageError("هذه الميزة غير متاحة في باقتك الحالية. تواصل مع Pixel One لتفعيل هذه الميزة.");
      return;
    }

    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setSelectedOrderId(order.id);
    setOrderDetails(null);
    setIsDetailsLoading(true);
    setPageError(null);

    try {
      const details = await getOrderWithItems(order.id, activeRestaurantId);
      setOrderDetails(details);
      setItemCounts((current) => ({ ...current, [order.id]: getItemsQuantity(details.items) }));
    } catch (error) {
      setPageError(getErrorMessage(error));
      setSelectedOrderId(null);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    if (order.isArchived) {
      setPageError("لا يمكن تغيير حالة طلب مؤرشف. استعده أولًا.");
      return;
    }

    if (!canUseOrders) {
      setPageError("لا يمكن حفظ هذه التغييرات لأن الميزة غير مفعلة.");
      return;
    }

    if (order.status === status) {
      return;
    }

    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setBusyOrderId(order.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const updatedOrder = await updateOrderStatus(order.id, status, activeRestaurantId);
      setOrders((current) => current.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)));
      setOrderDetails((current) => (current?.order.id === updatedOrder.id ? { ...current, order: updatedOrder } : current));
      logAction({
        action: "status_change",
        entityType: "order",
        entityId: updatedOrder.id,
        metadata: {
          orderId: updatedOrder.id,
          fromStatus: order.status,
          toStatus: updatedOrder.status,
        },
      });
      setSuccessMessage("تم تحديث حالة الطلب بنجاح.");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleArchiveOrder = async () => {
    if (!pendingArchiveOrder || !activeRestaurantId) {
      return;
    }

    setBusyOrderId(pendingArchiveOrder.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const archivedOrder = await archiveOrder(pendingArchiveOrder.id, activeRestaurantId);
      setOrders((current) => current.filter((item) => item.id !== archivedOrder.id));
      setOrderDetails((current) => (current?.order.id === archivedOrder.id ? null : current));
      setSelectedOrderId((current) => (current === archivedOrder.id ? null : current));
      logAction({
        action: "archive",
        entityType: "order",
        entityId: archivedOrder.id,
        metadata: {
          orderId: archivedOrder.id,
          status: archivedOrder.status,
        },
      });
      setSuccessMessage("تم نقل الطلب إلى الأرشيف بنجاح.");
      setPendingArchiveOrder(null);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleRestoreOrder = async (order: Order) => {
    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setBusyOrderId(order.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const restoredOrder = await restoreOrder(order.id, activeRestaurantId);
      setOrders((current) =>
        isArchiveView ? current.filter((item) => item.id !== restoredOrder.id) : current.map((item) => (item.id === restoredOrder.id ? restoredOrder : item)),
      );
      setOrderDetails((current) => (current?.order.id === restoredOrder.id ? { ...current, order: restoredOrder } : current));
      logAction({
        action: "restore",
        entityType: "order",
        entityId: restoredOrder.id,
        metadata: {
          orderId: restoredOrder.id,
          status: restoredOrder.status,
        },
      });
      setSuccessMessage("تمت استعادة الطلب بنجاح.");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyOrderId(null);
    }
  };

  const openWhatsappReply = (order: Order) => {
    const restaurantName = activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name || "المطعم";
    const trackUrl = activeRestaurantSlug ? `${window.location.origin}/r/${activeRestaurantSlug}/track` : "";
    const message = [
      `مرحبًا ${order.customerName}، بخصوص طلبك من ${restaurantName}.`,
      `حالة الطلب الآن: ${t(statusLabelKeys[order.status])}.`,
      order.trackingCode ? `رمز التتبع: ${order.trackingCode}` : null,
      trackUrl ? `رابط التتبع: ${trackUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(createWhatsappUrl(order.customerPhone, message), "_blank", "noopener,noreferrer");
  };

  const closeDetails = () => {
    if (busyOrderId) {
      return;
    }

    setSelectedOrderId(null);
    setOrderDetails(null);
  };

  const renderOrderCard = (order: Order) => (
    <AdminCard as="article" className="admin-order-card" key={order.id}>
      <div className="admin-order-card__header">
        <div>
          <span>{formatOrderId(order.id)}</span>
          <h3>{order.customerName}</h3>
        </div>
        <AdminStatusBadge tone={statusTones[order.status]}>{t(statusLabelKeys[order.status])}</AdminStatusBadge>
      </div>

      <div className="admin-order-card__meta">
        <div>
          <span>{t("trackingCode")}</span>
          <strong>{order.trackingCode || formatOrderId(order.id)}</strong>
        </div>
        <div>
          <span>الهاتف</span>
          <strong>{order.customerPhone}</strong>
        </div>
        <div>
          <span>الإجمالي</span>
          <strong>{formatPrice(order.totalAmount, adminCurrency)}</strong>
        </div>
        <div>
          <span>المنتجات</span>
          <strong>{itemCounts[order.id] ?? 0}</strong>
        </div>
        <div>
          <span>تاريخ الإنشاء</span>
          <strong>{formatDate(order.createdAt)}</strong>
        </div>
      </div>

      {isArchiveView ? (
        <div className="admin-feedback admin-feedback--warning">هذا الطلب مؤرشف، لذلك لا يمكن تغيير حالته قبل استعادته.</div>
      ) : (
        <label className="admin-order-card__status">
          <span>تغيير الحالة</span>
          <select
            value={order.status}
            onChange={(event) => void handleStatusChange(order, event.target.value as OrderStatus)}
            disabled={busyOrderId === order.id}
          >
            {orderStatuses.map((status) => (
              <option value={status} key={status}>
                {t(statusLabelKeys[status])}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="admin-order-card__actions">
        <AdminActionButton variant="secondary" icon={<Eye size={17} aria-hidden="true" />} onClick={() => void loadOrderDetails(order)}>
          عرض التفاصيل
        </AdminActionButton>
        {isArchiveView ? (
          canUseManualArchiveActions ? (
            <AdminActionButton
              variant="primary"
              icon={<RotateCcw size={17} aria-hidden="true" />}
              onClick={() => void handleRestoreOrder(order)}
              disabled={busyOrderId === order.id}
            >
              استعادة
            </AdminActionButton>
          ) : null
        ) : (
          <>
            <AdminActionButton variant="primary" icon={<MessageCircle size={17} aria-hidden="true" />} onClick={() => openWhatsappReply(order)}>
              الرد عبر واتساب
            </AdminActionButton>
            {canUseManualArchiveActions && canArchiveOrderRecord(order) ? (
              <AdminActionButton
                variant="secondary"
                icon={<Archive size={17} aria-hidden="true" />}
                onClick={() => setPendingArchiveOrder(order)}
                disabled={busyOrderId === order.id}
              >
                أرشفة
              </AdminActionButton>
            ) : null}
          </>
        )}
      </div>
    </AdminCard>
  );

  const renderContent = () => {
    if (scopeError) {
      return <AdminErrorState title="لا يمكن فتح الطلبات" message={scopeError} />;
    }

    if (!canUseOrders) {
      return <AdminFeatureUnavailable featureName="الطلبات" />;
    }

    if (isLoading) {
      return <AdminLoadingState label="جارٍ تحميل الطلبات..." />;
    }

    if (pageError) {
      return (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadOrders()}>
              إعادة المحاولة
            </AdminActionButton>
          }
        />
      );
    }

    if (orders.length === 0) {
      return (
        <AdminEmptyState
          icon={<ShoppingBag size={30} aria-hidden="true" />}
          title="لا توجد طلبات بعد"
          body="ستظهر الطلبات الواردة من الموقع هنا بعد إتمام العميل للطلب."
        />
      );
    }

    if (filteredOrders.length === 0) {
      return (
        <AdminEmptyState
          icon={<ShoppingBag size={30} aria-hidden="true" />}
          title="لا توجد طلبات بهذه الحالة"
          body="غيّر الفلتر لعرض حالات أخرى."
        />
      );
    }

    return <div className="admin-orders-grid">{filteredOrders.map(renderOrderCard)}</div>;
  };

  return (
    <section className="admin-orders-page">
      <AdminPageHeader
        eyebrow={activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name}
        title="الطلبات"
        description="تابع الطلبات الواردة من موقع مطعمك."
        actions={
          canManageRestaurantContent && canUseOrders ? (
            <AdminActionButton
              variant="secondary"
              icon={<RefreshCw size={18} aria-hidden="true" />}
              onClick={() => void loadOrders()}
              disabled={isLoading}
            >
              تحديث الطلبات
            </AdminActionButton>
          ) : null
        }
      />

      {canManageRestaurantContent && canUseOrders ? (
        <>
          <div className="admin-orders-stats" aria-label="ملخص الطلبات">
            <div>
              <span>جديد</span>
              <strong>{stats.new}</strong>
            </div>
            <div>
              <span>قيد التحضير</span>
              <strong>{stats.preparing}</strong>
            </div>
            <div>
              <span>جاهز</span>
              <strong>{stats.ready}</strong>
            </div>
            <div>
              <span>{t("orderStatusCompleted")}</span>
              <strong>{stats.completed}</strong>
            </div>
          </div>

          <div className="admin-orders-filters" aria-label="عرض الطلبات">
            {(["current", "terminal", "archive"] as const).map((view) => (
              <button
                className={view === orderView ? "is-active" : ""}
                type="button"
                onClick={() => {
                  setOrderView(view);
                  setStatusFilter("all");
                }}
                key={view}
              >
                {orderViewLabels[view]}
              </button>
            ))}
          </div>

          <div className="admin-orders-filters" aria-label="تصفية الطلبات حسب الحالة">
            {(["all", ...orderStatuses] as const).map((filter) => (
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
        isOpen={Boolean(selectedOrderId)}
        title={selectedOrder ? `تفاصيل الطلب ${formatOrderId(selectedOrder.id)}` : "تفاصيل الطلب"}
        description="معلومات العميل والمنتجات وحالة الطلب."
        onClose={closeDetails}
        size="lg"
      >
        {isDetailsLoading ? <AdminLoadingState label="جارٍ تحميل تفاصيل الطلب..." /> : null}

        {!isDetailsLoading && orderDetails ? (
          <div className="admin-order-details">
            <div className="admin-order-details__grid">
              <div>
                <span>العميل</span>
                <strong>{orderDetails.order.customerName}</strong>
              </div>
              <div>
                <span>الهاتف</span>
                <strong>{orderDetails.order.customerPhone}</strong>
              </div>
              <div>
                <span>{t("trackingCode")}</span>
                <strong>{orderDetails.order.trackingCode || formatOrderId(orderDetails.order.id)}</strong>
              </div>
              <div>
                <span>العنوان</span>
                <strong>{orderDetails.order.customerAddress || "غير متوفر"}</strong>
              </div>
              <div>
                <span>الحالة</span>
                <AdminStatusBadge tone={statusTones[orderDetails.order.status]}>
                  {t(statusLabelKeys[orderDetails.order.status])}
                </AdminStatusBadge>
              </div>
            </div>

            {orderDetails.order.notes ? (
              <div className="admin-order-details__notes">
                <span>الملاحظات</span>
                <p>{orderDetails.order.notes}</p>
              </div>
            ) : null}

            <div className="admin-order-details__items">
              <h3>المنتجات</h3>
              {orderDetails.items.map((item) => (
                <div className="admin-order-details__item" key={item.id}>
                  <div>
                    <strong>{item.dishName}</strong>
                    <span>الكمية: {item.quantity}</span>
                  </div>
                  <div>
                    <span>{formatPrice(item.unitPrice, adminCurrency)}</span>
                    <strong>{formatPrice(item.subtotal, adminCurrency)}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-order-details__total">
              <span>الإجمالي</span>
              <strong>{formatPrice(orderDetails.order.totalAmount, adminCurrency)}</strong>
            </div>

            {orderDetails.order.isArchived ? (
              <div className="admin-feedback admin-feedback--warning">لا يمكن تغيير حالة طلب داخل الأرشيف. استعد الطلب أولًا ثم عدّل حالته.</div>
            ) : (
              <div className="admin-order-status-actions">
                {orderStatuses.map((status) => (
                  <AdminActionButton
                    variant={status === orderDetails.order.status ? "primary" : "secondary"}
                    onClick={() => void handleStatusChange(orderDetails.order, status)}
                    disabled={busyOrderId === orderDetails.order.id}
                    key={status}
                  >
                    {t(statusLabelKeys[status])}
                  </AdminActionButton>
                ))}
              </div>
            )}

            <div className="admin-order-details__actions">
              {orderDetails.order.isArchived ? (
                canUseManualArchiveActions ? (
                  <AdminActionButton
                    variant="primary"
                    icon={<RotateCcw size={17} aria-hidden="true" />}
                    onClick={() => void handleRestoreOrder(orderDetails.order)}
                    disabled={busyOrderId === orderDetails.order.id}
                  >
                    استعادة
                  </AdminActionButton>
                ) : null
              ) : (
                <>
                  <AdminActionButton
                    variant="primary"
                    icon={<MessageCircle size={17} aria-hidden="true" />}
                    onClick={() => openWhatsappReply(orderDetails.order)}
                  >
                    الرد عبر واتساب
                  </AdminActionButton>
                  {canUseManualArchiveActions && canArchiveOrderRecord(orderDetails.order) ? (
                    <AdminActionButton
                      variant="secondary"
                      icon={<Archive size={17} aria-hidden="true" />}
                      onClick={() => setPendingArchiveOrder(orderDetails.order)}
                      disabled={busyOrderId === orderDetails.order.id}
                    >
                      أرشفة
                    </AdminActionButton>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </AdminFormModal>

      <AdminConfirmDialog
        isOpen={Boolean(pendingArchiveOrder)}
        title="أرشفة الطلب"
        message="لن يتم حذف الطلب. سيتم نقله إلى الأرشيف ويمكن استعادته لاحقًا."
        confirmLabel="أرشفة"
        isSubmitting={Boolean(pendingArchiveOrder && busyOrderId === pendingArchiveOrder.id)}
        onCancel={() => {
          if (!busyOrderId) {
            setPendingArchiveOrder(null);
          }
        }}
        onConfirm={() => void handleArchiveOrder()}
      />
    </section>
  );
}
