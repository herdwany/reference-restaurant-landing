import { AlertTriangle, Building2, ExternalLink, Loader2, RefreshCw, Search, ShieldCheck, UserPlus, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AdminActionButton from "../admin/components/AdminActionButton";
import AdminEmptyState from "../admin/components/AdminEmptyState";
import AdminErrorState from "../admin/components/AdminErrorState";
import AdminFormModal from "../admin/components/AdminFormModal";
import AdminLoadingState from "../admin/components/AdminLoadingState";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_RESTAURANT_SLUG } from "../lib/appwriteIds";
import { ADMIN_APPWRITE_REQUIRED_MESSAGE } from "../services/authService";
import {
  ClientOnboardingError,
  createClientViaFunction,
  hasCreateClientFunctionConfig,
  type CreateClientInput,
} from "../services/appwrite/clientOnboardingService";
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
type OnboardingBusinessType = CreateClientInput["businessType"];
type OnboardingStatus = CreateClientInput["status"];
type OnboardingPlan = NonNullable<CreateClientInput["plan"]>;

type CreateClientFormValues = {
  businessType: OnboardingBusinessType;
  notes: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhone: string;
  plan: OnboardingPlan;
  restaurantName: string;
  restaurantNameAr: string;
  slug: string;
  status: OnboardingStatus;
  temporaryPassword: string;
};

type CreateClientFormErrors = Partial<Record<keyof CreateClientFormValues, string>>;

const statusFilters = ["all", "active", "draft", "suspended"] as const satisfies readonly StatusFilter[];
const onboardingBusinessTypes = ["restaurant", "cafe", "bakery", "cloud_kitchen", "other"] as const satisfies readonly OnboardingBusinessType[];
const onboardingStatuses = ["draft", "active"] as const satisfies readonly OnboardingStatus[];
const onboardingPlans = ["", "starter", "pro", "premium"] as const satisfies readonly OnboardingPlan[];

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
  cloud_kitchen: "مطبخ سحابي",
  clinic: "عيادة",
  gym: "نادٍ رياضي",
  other: "أخرى",
  restaurant: "مطعم",
  salon: "صالون",
};

const onboardingStatusLabels: Record<OnboardingStatus, string> = {
  active: "نشط",
  draft: "مسودة",
};

const onboardingPlanLabels: Record<OnboardingPlan, string> = {
  "": "بدون خطة الآن",
  premium: "Premium",
  pro: "Pro",
  starter: "Starter",
};

const emptyCreateClientFormValues: CreateClientFormValues = {
  businessType: "restaurant",
  notes: "",
  ownerEmail: "",
  ownerName: "",
  ownerPhone: "",
  plan: "",
  restaurantName: "",
  restaurantNameAr: "",
  slug: "",
  status: "draft",
  temporaryPassword: "",
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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const isValidOptionalPhone = (value: string) => !value.trim() || /^\+?[0-9\s().-]{6,50}$/.test(value.trim());

const normalizeSlugInput = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const validateCreateClientForm = (values: CreateClientFormValues): CreateClientFormErrors => {
  const errors: CreateClientFormErrors = {};

  if (!values.restaurantName.trim()) {
    errors.restaurantName = "اسم المطعم مطلوب";
  }

  if (!values.slug.trim()) {
    errors.slug = "الرابط مطلوب";
  } else if (!isValidSlug(values.slug.trim())) {
    errors.slug = "استخدم أحرفًا صغيرة وأرقامًا وشرطات فقط";
  }

  if (!onboardingBusinessTypes.includes(values.businessType)) {
    errors.businessType = "نوع النشاط غير صالح";
  }

  if (!values.ownerName.trim()) {
    errors.ownerName = "اسم المالك مطلوب";
  }

  if (!values.ownerEmail.trim()) {
    errors.ownerEmail = "بريد المالك مطلوب";
  } else if (!isValidEmail(values.ownerEmail.trim())) {
    errors.ownerEmail = "بريد المالك غير صالح";
  }

  if (!isValidOptionalPhone(values.ownerPhone)) {
    errors.ownerPhone = "رقم الهاتف غير صالح";
  }

  if (!values.temporaryPassword.trim()) {
    errors.temporaryPassword = "كلمة المرور المؤقتة مطلوبة";
  } else if (values.temporaryPassword.length < 8) {
    errors.temporaryPassword = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
  }

  if (!onboardingStatuses.includes(values.status)) {
    errors.status = "حالة المطعم غير صالحة";
  }

  if (!onboardingPlans.includes(values.plan)) {
    errors.plan = "الخطة غير صالحة";
  }

  return errors;
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createClientValues, setCreateClientValues] = useState<CreateClientFormValues>(emptyCreateClientFormValues);
  const [createClientErrors, setCreateClientErrors] = useState<CreateClientFormErrors>({});
  const [createClientError, setCreateClientError] = useState<string | null>(null);
  const [createClientSuccess, setCreateClientSuccess] = useState<string | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

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

  const openCreateClientModal = () => {
    setCreateClientValues(emptyCreateClientFormValues);
    setCreateClientErrors({});
    setCreateClientError(null);
    setIsCreateModalOpen(true);
  };

  const closeCreateClientModal = () => {
    if (isCreatingClient) {
      return;
    }

    setIsCreateModalOpen(false);
    setCreateClientErrors({});
    setCreateClientError(null);
  };

  const updateCreateClientValue = <Key extends keyof CreateClientFormValues>(
    key: Key,
    value: CreateClientFormValues[Key],
  ) => {
    setCreateClientValues((current) => ({ ...current, [key]: value }));
    setCreateClientErrors((current) => ({ ...current, [key]: undefined }));
  };

  const getCreateClientErrorMessage = (error: unknown) => {
    if (error instanceof ClientOnboardingError) {
      return error.message;
    }

    return "تعذر إنشاء العميل. تحقق من البيانات أو إعدادات Function.";
  };

  const handleCreateClientSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateClientError(null);
    setCreateClientSuccess(null);

    if (!hasCreateClientFunctionConfig) {
      setCreateClientError("إعداد إنشاء العملاء غير مفعّل بعد. أضف Function ID.");
      return;
    }

    const normalizedValues = {
      ...createClientValues,
      ownerEmail: createClientValues.ownerEmail.trim().toLowerCase(),
      slug: normalizeSlugInput(createClientValues.slug),
    };
    const nextErrors = validateCreateClientForm(normalizedValues);
    setCreateClientValues(normalizedValues);
    setCreateClientErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsCreatingClient(true);

    try {
      const result = await createClientViaFunction({
        businessType: normalizedValues.businessType,
        notes: normalizedValues.notes.trim() || undefined,
        ownerEmail: normalizedValues.ownerEmail,
        ownerName: normalizedValues.ownerName.trim(),
        ownerPhone: normalizedValues.ownerPhone.trim() || undefined,
        plan: normalizedValues.plan,
        restaurantName: normalizedValues.restaurantName.trim(),
        restaurantNameAr: normalizedValues.restaurantNameAr.trim() || undefined,
        slug: normalizedValues.slug,
        status: normalizedValues.status,
        temporaryPassword: normalizedValues.temporaryPassword,
      });

      setCreateClientSuccess(
        result.warning
          ? `تم إنشاء العميل بنجاح. ${result.warning}`
          : "تم إنشاء العميل بنجاح. يمكنك الآن فتح لوحة العميل.",
      );
      setIsCreateModalOpen(false);
      setCreateClientValues(emptyCreateClientFormValues);
      await loadRestaurants();
    } catch (error) {
      setCreateClientError(getCreateClientErrorMessage(error));
    } finally {
      setIsCreatingClient(false);
    }
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
          <button className="admin-icon-link" type="button" onClick={openCreateClientModal}>
            <UserPlus size={17} aria-hidden="true" />
            <span>إضافة عميل</span>
          </button>
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

      {createClientSuccess ? <div className="admin-feedback admin-feedback--success">{createClientSuccess}</div> : null}

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

      <AdminFormModal
        isOpen={isCreateModalOpen}
        title="إضافة عميل"
        description="أنشئ مطعمًا وحساب مالك عبر Appwrite Function آمنة."
        onClose={closeCreateClientModal}
        size="lg"
      >
        <form className="admin-dish-form" onSubmit={handleCreateClientSubmit} noValidate>
          {!hasCreateClientFunctionConfig ? (
            <div className="admin-feedback admin-feedback--error">
              إعداد إنشاء العملاء غير مفعّل بعد. أضف Function ID.
            </div>
          ) : null}
          {createClientError ? <div className="admin-feedback admin-feedback--error">{createClientError}</div> : null}

          <div className="admin-form-grid">
            <label>
              <span>اسم المطعم</span>
              <input
                value={createClientValues.restaurantName}
                onChange={(event) => updateCreateClientValue("restaurantName", event.target.value)}
                aria-invalid={Boolean(createClientErrors.restaurantName)}
              />
              {createClientErrors.restaurantName ? <small>{createClientErrors.restaurantName}</small> : null}
            </label>

            <label>
              <span>اسم المطعم بالعربية</span>
              <input
                value={createClientValues.restaurantNameAr}
                onChange={(event) => updateCreateClientValue("restaurantNameAr", event.target.value)}
              />
            </label>

            <label>
              <span>الرابط slug</span>
              <input
                value={createClientValues.slug}
                onChange={(event) => updateCreateClientValue("slug", normalizeSlugInput(event.target.value))}
                aria-invalid={Boolean(createClientErrors.slug)}
                dir="ltr"
                placeholder="pizza-rabat"
              />
              {createClientErrors.slug ? <small>{createClientErrors.slug}</small> : null}
            </label>

            <label>
              <span>نوع النشاط</span>
              <select
                value={createClientValues.businessType}
                onChange={(event) => updateCreateClientValue("businessType", event.target.value as OnboardingBusinessType)}
                aria-invalid={Boolean(createClientErrors.businessType)}
              >
                {onboardingBusinessTypes.map((type) => (
                  <option value={type} key={type}>
                    {businessTypeLabels[type]}
                  </option>
                ))}
              </select>
              {createClientErrors.businessType ? <small>{createClientErrors.businessType}</small> : null}
            </label>

            <label>
              <span>اسم المالك</span>
              <input
                value={createClientValues.ownerName}
                onChange={(event) => updateCreateClientValue("ownerName", event.target.value)}
                aria-invalid={Boolean(createClientErrors.ownerName)}
              />
              {createClientErrors.ownerName ? <small>{createClientErrors.ownerName}</small> : null}
            </label>

            <label>
              <span>بريد المالك</span>
              <input
                value={createClientValues.ownerEmail}
                onChange={(event) => updateCreateClientValue("ownerEmail", event.target.value)}
                aria-invalid={Boolean(createClientErrors.ownerEmail)}
                inputMode="email"
                dir="ltr"
              />
              {createClientErrors.ownerEmail ? <small>{createClientErrors.ownerEmail}</small> : null}
            </label>

            <label>
              <span>هاتف المالك</span>
              <input
                value={createClientValues.ownerPhone}
                onChange={(event) => updateCreateClientValue("ownerPhone", event.target.value)}
                aria-invalid={Boolean(createClientErrors.ownerPhone)}
                inputMode="tel"
                dir="ltr"
                placeholder="+212612345678"
              />
              {createClientErrors.ownerPhone ? <small>{createClientErrors.ownerPhone}</small> : null}
            </label>

            <label>
              <span>كلمة مرور مؤقتة</span>
              <input
                type="password"
                value={createClientValues.temporaryPassword}
                onChange={(event) => updateCreateClientValue("temporaryPassword", event.target.value)}
                aria-invalid={Boolean(createClientErrors.temporaryPassword)}
                autoComplete="new-password"
              />
              {createClientErrors.temporaryPassword ? <small>{createClientErrors.temporaryPassword}</small> : null}
            </label>

            <label>
              <span>الحالة</span>
              <select
                value={createClientValues.status}
                onChange={(event) => updateCreateClientValue("status", event.target.value as OnboardingStatus)}
                aria-invalid={Boolean(createClientErrors.status)}
              >
                {onboardingStatuses.map((status) => (
                  <option value={status} key={status}>
                    {onboardingStatusLabels[status]}
                  </option>
                ))}
              </select>
              {createClientErrors.status ? <small>{createClientErrors.status}</small> : null}
            </label>

            <label>
              <span>الخطة</span>
              <select
                value={createClientValues.plan}
                onChange={(event) => updateCreateClientValue("plan", event.target.value as OnboardingPlan)}
                aria-invalid={Boolean(createClientErrors.plan)}
              >
                {onboardingPlans.map((plan) => (
                  <option value={plan} key={plan || "none"}>
                    {onboardingPlanLabels[plan]}
                  </option>
                ))}
              </select>
              {createClientErrors.plan ? <small>{createClientErrors.plan}</small> : null}
            </label>

            <label className="admin-form-grid__wide">
              <span>ملاحظات داخلية</span>
              <textarea
                value={createClientValues.notes}
                onChange={(event) => updateCreateClientValue("notes", event.target.value)}
                rows={3}
              />
            </label>
          </div>

          <div className="admin-dish-form__actions">
            <AdminActionButton variant="ghost" onClick={closeCreateClientModal} disabled={isCreatingClient}>
              إلغاء
            </AdminActionButton>
            <AdminActionButton variant="primary" type="submit" disabled={isCreatingClient || !hasCreateClientFunctionConfig}>
              {isCreatingClient ? "جارٍ الإنشاء..." : "إنشاء العميل"}
            </AdminActionButton>
          </div>
        </form>
      </AdminFormModal>
    </main>
  );
}
