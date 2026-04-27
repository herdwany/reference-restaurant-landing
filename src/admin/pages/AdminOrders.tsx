import { Eye, MessageCircle, RefreshCw, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminActionButton from "../components/AdminActionButton";
import AdminCard from "../components/AdminCard";
import AdminEmptyState from "../components/AdminEmptyState";
import AdminErrorState from "../components/AdminErrorState";
import AdminFormModal from "../components/AdminFormModal";
import AdminLoadingState from "../components/AdminLoadingState";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminStatusBadge from "../components/AdminStatusBadge";
import { useActiveRestaurantScope } from "../hooks/useActiveRestaurantScope";
import {
  OrdersRepositoryError,
  getOrderItems,
  getOrderWithItems,
  getOrdersByRestaurant,
  updateOrderStatus,
  type OrderWithItems,
} from "../../services/repositories/ordersRepository";
import type { Order, OrderItem, OrderStatus } from "../../types/platform";
import { createWhatsappUrl, formatPrice } from "../../utils/formatters";

type OrderFilter = OrderStatus | "all";
type StatusTone = "success" | "warning" | "neutral" | "danger";

const adminCurrency = "ر.س";
const orderStatuses = ["new", "confirmed", "preparing", "ready", "delivered", "cancelled"] as const satisfies readonly OrderStatus[];

const statusLabels: Record<OrderStatus, string> = {
  new: "جديد",
  confirmed: "مؤكد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const statusTones: Record<OrderStatus, StatusTone> = {
  new: "neutral",
  confirmed: "neutral",
  preparing: "warning",
  ready: "success",
  delivered: "success",
  cancelled: "danger",
};

const filterLabels: Record<OrderFilter, string> = {
  all: "الكل",
  ...statusLabels,
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
  const { activeRestaurant, activeRestaurantId, canManageRestaurantContent, scopeError } = useActiveRestaurantScope();
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<OrderFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderWithItems | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      new: orders.filter((order) => order.status === "new").length,
      preparing: orders.filter((order) => order.status === "preparing").length,
      ready: orders.filter((order) => order.status === "ready").length,
      delivered: orders.filter((order) => order.status === "delivered").length,
    }),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") {
      return orders;
    }

    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return null;
    }

    return orderDetails?.order.id === selectedOrderId ? orderDetails.order : orders.find((order) => order.id === selectedOrderId) ?? null;
  }, [orderDetails, orders, selectedOrderId]);

  const loadOrders = useCallback(async () => {
    if (!activeRestaurantId) {
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const loadedOrders = await getOrdersByRestaurant(activeRestaurantId);
      const itemCountPairs = await Promise.all(
        loadedOrders.map(async (order) => {
          const items = await getOrderItems(order.id, activeRestaurantId);
          return [order.id, getItemsQuantity(items)] as const;
        }),
      );

      setOrders(loadedOrders);
      setItemCounts(Object.fromEntries(itemCountPairs));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId]);

  useEffect(() => {
    if (!canManageRestaurantContent || !activeRestaurantId) {
      setOrders([]);
      setItemCounts({});
      return;
    }

    void loadOrders();
  }, [activeRestaurantId, canManageRestaurantContent, loadOrders]);

  const loadOrderDetails = async (order: Order) => {
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
      setSuccessMessage("تم تحديث حالة الطلب بنجاح.");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyOrderId(null);
    }
  };

  const openWhatsappReply = (order: Order) => {
    const restaurantName = activeRestaurant?.nameAr || activeRestaurant?.name || "المطعم";
    const message = `مرحبًا ${order.customerName}، بخصوص طلبك من ${restaurantName}، حالة طلبك الآن: ${statusLabels[order.status]}.`;

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
        <AdminStatusBadge tone={statusTones[order.status]}>{statusLabels[order.status]}</AdminStatusBadge>
      </div>

      <div className="admin-order-card__meta">
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

      <label className="admin-order-card__status">
        <span>تغيير الحالة</span>
        <select
          value={order.status}
          onChange={(event) => void handleStatusChange(order, event.target.value as OrderStatus)}
          disabled={busyOrderId === order.id}
        >
          {orderStatuses.map((status) => (
            <option value={status} key={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </label>

      <div className="admin-order-card__actions">
        <AdminActionButton variant="secondary" icon={<Eye size={17} aria-hidden="true" />} onClick={() => void loadOrderDetails(order)}>
          عرض التفاصيل
        </AdminActionButton>
        <AdminActionButton variant="primary" icon={<MessageCircle size={17} aria-hidden="true" />} onClick={() => openWhatsappReply(order)}>
          الرد عبر واتساب
        </AdminActionButton>
      </div>
    </AdminCard>
  );

  const renderContent = () => {
    if (scopeError) {
      return <AdminErrorState title="لا يمكن فتح الطلبات" message={scopeError} />;
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
        eyebrow={activeRestaurant?.nameAr || activeRestaurant?.name}
        title="الطلبات"
        description="تابع الطلبات الواردة من موقع مطعمك."
        actions={
          canManageRestaurantContent ? (
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

      {canManageRestaurantContent && orders.length > 0 ? (
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
              <span>مكتمل/تم التسليم</span>
              <strong>{stats.delivered}</strong>
            </div>
          </div>

          <div className="admin-orders-filters" aria-label="تصفية الطلبات حسب الحالة">
            {(["all", ...orderStatuses] as const).map((filter) => (
              <button
                className={filter === statusFilter ? "is-active" : ""}
                type="button"
                onClick={() => setStatusFilter(filter)}
                key={filter}
              >
                {filterLabels[filter]}
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
                <span>العنوان</span>
                <strong>{orderDetails.order.customerAddress || "غير متوفر"}</strong>
              </div>
              <div>
                <span>الحالة</span>
                <AdminStatusBadge tone={statusTones[orderDetails.order.status]}>{statusLabels[orderDetails.order.status]}</AdminStatusBadge>
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

            <div className="admin-order-status-actions">
              {orderStatuses.map((status) => (
                <AdminActionButton
                  variant={status === orderDetails.order.status ? "primary" : "secondary"}
                  onClick={() => void handleStatusChange(orderDetails.order, status)}
                  disabled={busyOrderId === orderDetails.order.id}
                  key={status}
                >
                  {statusLabels[status]}
                </AdminActionButton>
              ))}
            </div>

            <div className="admin-order-details__actions">
              <AdminActionButton
                variant="primary"
                icon={<MessageCircle size={17} aria-hidden="true" />}
                onClick={() => openWhatsappReply(orderDetails.order)}
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
