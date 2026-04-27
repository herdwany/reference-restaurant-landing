import { AlertTriangle, Building2, ExternalLink, Loader2, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AdminActionButton from "../admin/components/AdminActionButton";
import AdminEmptyState from "../admin/components/AdminEmptyState";
import AdminErrorState from "../admin/components/AdminErrorState";
import AdminLoadingState from "../admin/components/AdminLoadingState";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_RESTAURANT_SLUG } from "../lib/appwriteIds";
import { ADMIN_APPWRITE_REQUIRED_MESSAGE } from "../services/authService";
import {
  RestaurantRepositoryError,
  getRestaurantStatsForAgency,
  getRestaurantsForAgency,
} from "../services/repositories/restaurantRepository";
import type { BusinessType, Restaurant, RestaurantStatus } from "../types/platform";
import {
  clearAgencySelectedRestaurant,
  getAgencySelectedRestaurant,
  setAgencySelectedRestaurant,
} from "./agencySelection";

type AgencyStatusMessageProps = {
  action?: ReactNode;
  body: string;
  isLoading?: boolean;
  title: string;
};

type StatusFilter = RestaurantStatus | "all";

const statusFilters = ["all", "active", "draft", "suspended"] as const satisfies readonly StatusFilter[];

const statusLabels: Record<StatusFilter, string> = {
  active: "نشط",
  all: "الكل",
  draft: "مسودة",
  suspended: "معلّق",
};

const businessTypeLabels: Record<BusinessType, string> = {
  bakery: "مخبز",
  cafe: "مقهى",
  car_rental: "تأجير سيارات",
  clinic: "عيادة",
  gym: "نادٍ رياضي",
  other: "أخرى",
  restaurant: "مطعم",
  salon: "صالون",
};

function AgencyStatusMessage({ action, body, isLoading = false, title }: AgencyStatusMessageProps) {
  const Icon = isLoading ? Loader2 : AlertTriangle;

  return (
    <main className="agency-shell agency-shell--centered" dir="rtl">
      <section className="admin-status-card agency-status-card" role={isLoading ? undefined : "alert"} aria-busy={isLoading}>
        <Icon className={isLoading ? "admin-spin" : undefined} aria-hidden="true" />
        <h1>{title}</h1>
        <p>{body}</p>
        {!isLoading && action ? action : null}
        {!isLoading && !action ? (
          <Link className="admin-primary-link" to="/admin/login">
            تسجيل الدخول
          </Link>
        ) : null}
      </section>
    </main>
  );
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof RestaurantRepositoryError) {
    return error.message;
  }

  return "تعذر تحميل مواقع العملاء. تحقق من الاتصال أو صلاحيات Appwrite.";
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

const matchesSearch = (restaurant: Restaurant, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [restaurant.name, restaurant.nameAr, restaurant.slug]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalizedQuery));
};

export default function AgencyDashboard() {
  const { isAgencyAdmin, isAuthConfigured, isAuthenticated, isLoading: isAuthLoading, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(() => getAgencySelectedRestaurant());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadRestaurants = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const loadedRestaurants = await getRestaurantsForAgency(100);
      setRestaurants(loadedRestaurants);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAgencyAdmin) {
      setRestaurants([]);
      return;
    }

    void loadRestaurants();
  }, [isAgencyAdmin, loadRestaurants]);

  const stats = useMemo(() => getRestaurantStatsForAgency(restaurants), [restaurants]);

  const filteredRestaurants = useMemo(
    () =>
      restaurants.filter((restaurant) => {
        const statusMatches = statusFilter === "all" || restaurant.status === statusFilter;
        return statusMatches && matchesSearch(restaurant, searchQuery);
      }),
    [restaurants, searchQuery, statusFilter],
  );

  if (!isAuthConfigured) {
    return (
      <AgencyStatusMessage
        title={ADMIN_APPWRITE_REQUIRED_MESSAGE}
        body="أضف متغيرات Appwrite في ملف البيئة ثم أعد تشغيل Vite لتفعيل لوحة الوكالة."
      />
    );
  }

  if (isAuthLoading) {
    return (
      <AgencyStatusMessage
        title="جاري التحقق من الجلسة"
        body="نراجع حالة تسجيل الدخول وصلاحية الحساب قبل فتح لوحة الوكالة."
        isLoading
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (!isAgencyAdmin) {
    return (
      <AgencyStatusMessage
        title="هذه الصفحة مخصصة لإدارة الوكالة فقط."
        body={role === "owner" || role === "staff" ? "حسابات العملاء تستخدم لوحة /admin الخاصة بالمطعم." : "لا يملك هذا الحساب صلاحية دخول لوحة الوكالة."}
        action={
          <Link className="admin-primary-link" to="/admin">
            العودة إلى لوحة التحكم
          </Link>
        }
      />
    );
  }

  const openClientAdmin = (restaurant: Restaurant) => {
    setAgencySelectedRestaurant(restaurant);
    setSelectedRestaurant(getAgencySelectedRestaurant());
    navigate("/admin");
  };

  const clearSelectedRestaurant = () => {
    clearAgencySelectedRestaurant();
    setSelectedRestaurant(null);
  };

  return (
    <main className="agency-shell" dir="rtl">
      <header className="agency-header">
        <div>
          <span>
            <ShieldCheck size={18} aria-hidden="true" />
            Pixel One Visuals
          </span>
          <h1>لوحة الوكالة</h1>
          <p>إدارة مواقع العملاء والمطاعم المرتبطة بـ Pixel One.</p>
        </div>
        <div className="agency-header__actions">
          <Link className="admin-icon-link" to="/admin">
            لوحة العميل
          </Link>
          {selectedRestaurant ? (
            <button className="admin-icon-link" type="button" onClick={clearSelectedRestaurant}>
              <X size={17} aria-hidden="true" />
              <span>إلغاء الاختيار</span>
            </button>
          ) : null}
          <Link className="admin-icon-link" to="/">
            الموقع العام
          </Link>
        </div>
      </header>

      {selectedRestaurant ? (
        <section className="agency-selection-banner" aria-label="المطعم المحدد حاليًا">
          <div>
            <span>الاختيار الحالي</span>
            <strong>{selectedRestaurant.selectedRestaurantName}</strong>
            <code>{selectedRestaurant.selectedRestaurantSlug}</code>
          </div>
          <Link className="admin-primary-link" to="/admin">
            فتح لوحة العميل
          </Link>
        </section>
      ) : null}

      <section className="agency-stats" aria-label="إحصائيات المواقع">
        <div>
          <span>إجمالي المواقع</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>نشطة</span>
          <strong>{stats.active}</strong>
        </div>
        <div>
          <span>معلّقة</span>
          <strong>{stats.suspended}</strong>
        </div>
        <div>
          <span>مسودة</span>
          <strong>{stats.draft}</strong>
        </div>
      </section>

      <section className="agency-toolbar" aria-label="بحث وتصفية المواقع">
        <label className="agency-search">
          <Search size={18} aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="ابحث بالاسم أو slug"
          />
        </label>

        <div className="agency-filters">
          {statusFilters.map((filter) => (
            <button
              className={filter === statusFilter ? "is-active" : ""}
              type="button"
              onClick={() => setStatusFilter(filter)}
              key={filter}
            >
              {statusLabels[filter]}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? <AdminLoadingState label="جارٍ تحميل مواقع العملاء..." /> : null}

      {!isLoading && pageError ? (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadRestaurants()}>
              إعادة المحاولة
            </AdminActionButton>
          }
        />
      ) : null}

      {!isLoading && !pageError && restaurants.length === 0 ? (
        <AdminEmptyState
          icon={<Building2 size={30} aria-hidden="true" />}
          title="لا توجد مواقع بعد"
          body="ستظهر هنا المطاعم والمواقع الموجودة في جدول restaurants."
        />
      ) : null}

      {!isLoading && !pageError && restaurants.length > 0 && filteredRestaurants.length === 0 ? (
        <AdminEmptyState
          icon={<Search size={30} aria-hidden="true" />}
          title="لا توجد نتائج مطابقة"
          body="جرّب تغيير البحث أو فلتر الحالة."
        />
      ) : null}

      {!isLoading && !pageError && filteredRestaurants.length > 0 ? (
        <section className="agency-restaurant-grid" aria-label="مواقع العملاء">
          {filteredRestaurants.map((restaurant) => {
            const isSelected = selectedRestaurant?.selectedRestaurantId === restaurant.id;

            return (
              <article className={`agency-restaurant-card${isSelected ? " is-selected" : ""}`} key={restaurant.id}>
                <div className="agency-restaurant-card__header">
                  <div>
                    <h2>{restaurant.nameAr || restaurant.name}</h2>
                    <code>{restaurant.slug}</code>
                  </div>
                  <div className="agency-restaurant-card__badges">
                    {isSelected ? <span className="agency-current-selection">محدد الآن</span> : null}
                    <span className={`agency-status agency-status--${restaurant.status}`}>{statusLabels[restaurant.status]}</span>
                  </div>
                </div>

                <div className="agency-restaurant-card__meta">
                  <div>
                    <span>نوع النشاط</span>
                    <strong>{businessTypeLabels[restaurant.businessType] ?? restaurant.businessType}</strong>
                  </div>
                  <div>
                    <span>Owner User ID</span>
                    <strong>{restaurant.ownerUserId || "غير محدد"}</strong>
                  </div>
                  <div>
                    <span>تاريخ الإنشاء</span>
                    <strong>{formatDate(restaurant.createdAt)}</strong>
                  </div>
                </div>

                <div className="agency-restaurant-card__actions">
                  {restaurant.slug === DEFAULT_RESTAURANT_SLUG ? (
                    <a className="admin-action-button admin-action-button--secondary" href="/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={17} aria-hidden="true" />
                      <span>معاينة الموقع</span>
                    </a>
                  ) : (
                    <button className="admin-action-button admin-action-button--secondary" type="button" disabled>
                      <ExternalLink size={17} aria-hidden="true" />
                      <span>معاينة الموقع</span>
                    </button>
                  )}

                  <AdminActionButton variant="primary" onClick={() => openClientAdmin(restaurant)}>
                    فتح لوحة العميل
                  </AdminActionButton>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
