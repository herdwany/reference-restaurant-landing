import {
  AlertTriangle,
  Building2,
  ExternalLink,
  Globe2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AdminActionButton from "../admin/components/AdminActionButton";
import AdminEmptyState from "../admin/components/AdminEmptyState";
import AdminErrorState from "../admin/components/AdminErrorState";
import AdminFormModal from "../admin/components/AdminFormModal";
import AdminLoadingState from "../admin/components/AdminLoadingState";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../lib/i18n/I18nContext";
import { clientPlans, getDefaultSupportLevelForPlan, planDefinitions } from "../lib/plans";
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
  updateClientControlsViaFunction,
  updateDomainSettingsViaFunction,
} from "../services/repositories/restaurantRepository";
import type {
  BillingStatus,
  BusinessType,
  ClientPlan,
  DomainStatus,
  DomainType,
  Restaurant,
  RestaurantStatus,
  SupportLevel,
} from "../types/platform";
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
type OnboardingStatus = "draft" | "active";
type OnboardingPlan = CreateClientInput["plan"];
type AgencyControlsFormValues = {
  billingStatus: BillingStatus;
  plan: ClientPlan;
  status: RestaurantStatus;
  subscriptionEndsAt: string;
  supportLevel: SupportLevel;
  trialEndsAt: string;
};
type AgencyDomainFormValues = {
  customDomain: string;
  dnsTarget: string;
  domainNotes: string;
  domainStatus: DomainStatus;
  domainType: DomainType;
  domainVerifiedAt: string;
  subdomain: string;
};
type AgencyDomainFormErrors = Partial<Record<keyof AgencyDomainFormValues, string>>;

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

const statusFilters = ["all", "active", "draft", "suspended", "cancelled"] as const satisfies readonly StatusFilter[];
const onboardingBusinessTypes = ["restaurant", "cafe", "bakery", "cloud_kitchen"] as const satisfies readonly OnboardingBusinessType[];
const onboardingStatuses = ["draft", "active"] as const satisfies readonly OnboardingStatus[];
const onboardingPlans = clientPlans;
const billingStatuses = ["trial", "active", "overdue", "cancelled"] as const satisfies readonly BillingStatus[];
const supportLevels = ["basic", "standard", "priority", "managed"] as const satisfies readonly SupportLevel[];
const domainTypes = ["pixelone_path", "subdomain", "custom_domain"] as const satisfies readonly DomainType[];
const domainStatuses = ["not_configured", "pending_dns", "pending_verification", "active", "failed"] as const satisfies readonly DomainStatus[];
const pixelOneSubdomainBase = "pixelonevisuals.tech";

const statusLabels: Record<StatusFilter, string> = {
  active: "نشط",
  all: "الكل",
  cancelled: "ملغي",
  draft: "مسودة",
  suspended: "معلّق",
};

const planLabels: Record<ClientPlan, string> = {
  starter: "Starter",
  pro: "Pro",
  premium: "Premium",
  managed: "Managed",
};

const billingStatusLabels: Record<BillingStatus, string> = {
  trial: "تجريبي",
  active: "مدفوع",
  overdue: "متأخر",
  cancelled: "ملغي",
};

const supportLevelLabels: Record<SupportLevel, string> = {
  basic: "أساسي",
  standard: "قياسي",
  priority: "أولوية",
  managed: "مُدار",
};

const domainTypeLabels: Record<DomainType, string> = {
  pixelone_path: "رابط المنصة",
  subdomain: "Subdomain",
  custom_domain: "Custom domain",
};

const domainStatusLabels: Record<DomainStatus, string> = {
  not_configured: "غير مضبوط",
  pending_dns: "بانتظار DNS",
  pending_verification: "بانتظار التحقق",
  active: "نشط",
  failed: "فشل",
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
  managed: "Managed",
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
  plan: "starter",
  restaurantName: "",
  restaurantNameAr: "",
  slug: "",
  status: "draft",
  temporaryPassword: "",
};

function AgencyStatusMessage({ action, body, isLoading = false, title }: AgencyStatusMessageProps) {
  const { direction } = useI18n();
  const Icon = isLoading ? Loader2 : AlertTriangle;

  return (
    <main className={`agency-shell agency-shell--centered dir-${direction}`} dir={direction}>
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

const toDateTimeInputValue = (value: string | undefined) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const fromDateTimeInputValue = (value: string) => {
  if (!value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const getAgencyControlsFormValues = (restaurant: Restaurant): AgencyControlsFormValues => ({
  billingStatus: restaurant.billingStatus,
  plan: restaurant.plan,
  status: restaurant.status,
  subscriptionEndsAt: toDateTimeInputValue(restaurant.subscriptionEndsAt),
  supportLevel: restaurant.supportLevel,
  trialEndsAt: toDateTimeInputValue(restaurant.trialEndsAt),
});

const getAgencyDomainFormValues = (restaurant: Restaurant): AgencyDomainFormValues => ({
  customDomain: restaurant.customDomain || restaurant.domain || "",
  dnsTarget: restaurant.dnsTarget || pixelOneSubdomainBase,
  domainNotes: restaurant.domainNotes || "",
  domainStatus: restaurant.domainStatus || "not_configured",
  domainType: restaurant.domainType || "pixelone_path",
  domainVerifiedAt: toDateTimeInputValue(restaurant.domainVerifiedAt),
  subdomain: restaurant.subdomain || "",
});

const getPublicPreviewPath = (restaurant: Pick<Restaurant, "slug">) =>
  restaurant.slug ? `/r/${restaurant.slug}` : "غير متوفر";

const getPlannedDomainPreview = (values: AgencyDomainFormValues, slug: string) => {
  if (values.domainType === "subdomain") {
    return `${values.subdomain.trim().toLowerCase() || "client"}.${pixelOneSubdomainBase}`;
  }

  if (values.domainType === "custom_domain") {
    return values.customDomain.trim().toLowerCase() || "www.clientdomain.ma";
  }

  return slug ? `/r/${slug}` : "/r/:slug";
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
const isValidSubdomain = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const isValidCustomDomain = (value: string) =>
  Boolean(value.trim()) &&
  !/\s/.test(value) &&
  !/^https?:\/\//i.test(value) &&
  !/[/:?#]/.test(value) &&
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value);

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

const validateDomainForm = (values: AgencyDomainFormValues): AgencyDomainFormErrors => {
  const errors: AgencyDomainFormErrors = {};
  const subdomain = values.subdomain.trim().toLowerCase();
  const customDomain = values.customDomain.trim().toLowerCase().replace(/\.$/, "");

  if (!domainTypes.includes(values.domainType)) {
    errors.domainType = "نوع الدومين غير صالح";
  }

  if (!domainStatuses.includes(values.domainStatus)) {
    errors.domainStatus = "حالة الدومين غير صالحة";
  }

  if (values.domainType === "subdomain" && !subdomain) {
    errors.subdomain = "Subdomain مطلوب";
  } else if (subdomain && !isValidSubdomain(subdomain)) {
    errors.subdomain = "استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطات فقط";
  }

  if (values.domainType === "custom_domain" && !customDomain) {
    errors.customDomain = "Custom domain مطلوب";
  } else if (customDomain && !isValidCustomDomain(customDomain)) {
    errors.customDomain = "اكتب الدومين بدون http:// أو https:// وبدون مسافات";
  }

  return errors;
};

const getControlsErrorMessage = (error: unknown) => {
  if (error instanceof RestaurantRepositoryError) {
    return error.message;
  }

  return "تعذر تحديث الباقة. تحقق من الصلاحيات أو الاتصال.";
};

const getDomainErrorMessage = (error: unknown) => {
  if (error instanceof RestaurantRepositoryError) {
    return error.message;
  }

  return "تعذر تحديث إعدادات الدومين. تحقق من البيانات أو صلاحيات Appwrite.";
};

export default function AgencyDashboard() {
  const { direction, t } = useI18n();
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
  const [controlsRestaurant, setControlsRestaurant] = useState<Restaurant | null>(null);
  const [controlsValues, setControlsValues] = useState<AgencyControlsFormValues | null>(null);
  const [controlsError, setControlsError] = useState<string | null>(null);
  const [controlsSuccess, setControlsSuccess] = useState<string | null>(null);
  const [isSavingControls, setIsSavingControls] = useState(false);
  const [domainRestaurant, setDomainRestaurant] = useState<Restaurant | null>(null);
  const [domainValues, setDomainValues] = useState<AgencyDomainFormValues | null>(null);
  const [domainErrors, setDomainErrors] = useState<AgencyDomainFormErrors>({});
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainSuccess, setDomainSuccess] = useState<string | null>(null);
  const [isSavingDomain, setIsSavingDomain] = useState(false);

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

  const openControlsModal = (restaurant: Restaurant) => {
    setControlsRestaurant(restaurant);
    setControlsValues(getAgencyControlsFormValues(restaurant));
    setControlsError(null);
  };

  const closeControlsModal = () => {
    if (isSavingControls) {
      return;
    }

    setControlsRestaurant(null);
    setControlsValues(null);
    setControlsError(null);
  };

  const openDomainModal = (restaurant: Restaurant) => {
    setDomainRestaurant(restaurant);
    setDomainValues(getAgencyDomainFormValues(restaurant));
    setDomainErrors({});
    setDomainError(null);
  };

  const closeDomainModal = () => {
    if (isSavingDomain) {
      return;
    }

    setDomainRestaurant(null);
    setDomainValues(null);
    setDomainErrors({});
    setDomainError(null);
  };

  const updateDomainValue = <Key extends keyof AgencyDomainFormValues>(
    key: Key,
    value: AgencyDomainFormValues[Key],
  ) => {
    setDomainValues((current) => (current ? { ...current, [key]: value } : current));
    setDomainErrors((current) => ({ ...current, [key]: undefined }));
    setDomainError(null);
  };

  const updateControlsValue = <Key extends keyof AgencyControlsFormValues>(
    key: Key,
    value: AgencyControlsFormValues[Key],
  ) => {
    setControlsValues((current) => {
      if (!current) {
        return current;
      }

      if (key === "plan") {
        const nextPlan = value as ClientPlan;
        return {
          ...current,
          plan: nextPlan,
          supportLevel: getDefaultSupportLevelForPlan(nextPlan),
        };
      }

      return { ...current, [key]: value };
    });
    setControlsError(null);
  };

  const handleControlsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!controlsRestaurant || !controlsValues) {
      return;
    }

    setIsSavingControls(true);
    setControlsError(null);
    setControlsSuccess(null);

    try {
      const subscriptionEndsAt = fromDateTimeInputValue(controlsValues.subscriptionEndsAt);
      const trialEndsAt = fromDateTimeInputValue(controlsValues.trialEndsAt);
      const updatedRestaurant = await updateClientControlsViaFunction(controlsRestaurant.id, {
        billingStatus: controlsValues.billingStatus,
        plan: controlsValues.plan,
        status: controlsValues.status,
        supportLevel: controlsValues.supportLevel,
        ...(subscriptionEndsAt ? { subscriptionEndsAt } : {}),
        ...(trialEndsAt ? { trialEndsAt } : {}),
      });

      setRestaurants((current) =>
        current.map((restaurant) => (restaurant.id === updatedRestaurant.id ? updatedRestaurant : restaurant)),
      );

      if (selectedRestaurant?.selectedRestaurantId === updatedRestaurant.id) {
        setAgencySelectedRestaurant(updatedRestaurant);
        setSelectedRestaurant(getAgencySelectedRestaurant());
      }

      setControlsSuccess("تم تحديث باقة العميل بنجاح.");
      setControlsRestaurant(null);
      setControlsValues(null);
    } catch (error) {
      setControlsError(getControlsErrorMessage(error));
    } finally {
      setIsSavingControls(false);
    }
  };

  const handleDomainSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!domainRestaurant || !domainValues) {
      return;
    }

    const normalizedValues: AgencyDomainFormValues = {
      ...domainValues,
      customDomain: domainValues.customDomain.trim().toLowerCase().replace(/\.$/, ""),
      dnsTarget: domainValues.dnsTarget.trim(),
      domainNotes: domainValues.domainNotes.trim(),
      subdomain: domainValues.subdomain.trim().toLowerCase(),
    };
    const nextErrors = validateDomainForm(normalizedValues);
    setDomainValues(normalizedValues);
    setDomainErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSavingDomain(true);
    setDomainError(null);
    setDomainSuccess(null);

    try {
      const updatedRestaurant = await updateDomainSettingsViaFunction(domainRestaurant.id, {
        customDomain: normalizedValues.customDomain || null,
        dnsTarget: normalizedValues.dnsTarget || null,
        domainNotes: normalizedValues.domainNotes || null,
        domainStatus: normalizedValues.domainStatus,
        domainType: normalizedValues.domainType,
        domainVerifiedAt: fromDateTimeInputValue(normalizedValues.domainVerifiedAt) ?? null,
        subdomain: normalizedValues.subdomain || null,
      });

      setRestaurants((current) =>
        current.map((restaurant) => (restaurant.id === updatedRestaurant.id ? updatedRestaurant : restaurant)),
      );
      setDomainSuccess("تم تحديث إعدادات الدومين بنجاح.");
      setDomainRestaurant(null);
      setDomainValues(null);
    } catch (error) {
      setDomainError(getDomainErrorMessage(error));
    } finally {
      setIsSavingDomain(false);
    }
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
    <main className={`agency-shell dir-${direction}`} dir={direction}>
      <header className="agency-header">
        <div>
          <span>
            <ShieldCheck size={18} aria-hidden="true" />
            Pixel One Visuals
          </span>
          <h1>{t("agencyDashboard")}</h1>
          <p>إدارة مواقع العملاء والمطاعم المرتبطة بـ Pixel One.</p>
        </div>
        <div className="agency-header__actions">
          <button className="admin-icon-link" type="button" onClick={openCreateClientModal}>
            <UserPlus size={17} aria-hidden="true" />
            <span>{t("addClient")}</span>
          </button>
          <LanguageSwitcher className="language-switcher--agency" />
          <Link className="admin-icon-link" to="/admin">
            {t("openClientDashboard")}
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
        <div>
          <span>ملغية</span>
          <strong>{stats.cancelled}</strong>
        </div>
      </section>

      {createClientSuccess ? <div className="admin-feedback admin-feedback--success">{createClientSuccess}</div> : null}
      {controlsSuccess ? <div className="admin-feedback admin-feedback--success">{controlsSuccess}</div> : null}
      {domainSuccess ? <div className="admin-feedback admin-feedback--success">{domainSuccess}</div> : null}

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
                    <span className="agency-plan-badge">{planLabels[restaurant.plan]}</span>
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
                    <span>الخطة</span>
                    <strong>{planLabels[restaurant.plan]}</strong>
                  </div>
                  <div>
                    <span>حالة الدفع</span>
                    <strong>{billingStatusLabels[restaurant.billingStatus]}</strong>
                  </div>
                  <div>
                    <span>الدعم</span>
                    <strong>{supportLevelLabels[restaurant.supportLevel]}</strong>
                  </div>
                  <div>
                    <span>نهاية الاشتراك</span>
                    <strong>{formatDate(restaurant.subscriptionEndsAt)}</strong>
                  </div>
                  <div>
                    <span>تاريخ الإنشاء</span>
                    <strong>{formatDate(restaurant.createdAt)}</strong>
                  </div>
                  <div>
                    <span>الرابط الحالي</span>
                    <strong dir="ltr">{getPublicPreviewPath(restaurant)}</strong>
                  </div>
                  <div>
                    <span>نوع الدومين</span>
                    <strong>{domainTypeLabels[restaurant.domainType]}</strong>
                  </div>
                  <div>
                    <span>حالة الدومين</span>
                    <strong>{domainStatusLabels[restaurant.domainStatus]}</strong>
                  </div>
                  <div>
                    <span>الرابط المخطط</span>
                    <strong dir="ltr">{getPlannedDomainPreview(getAgencyDomainFormValues(restaurant), restaurant.slug)}</strong>
                  </div>
                </div>

                <div className="agency-restaurant-card__actions">
                  {restaurant.slug ? (
                    <a
                      className="admin-action-button admin-action-button--secondary"
                      href={`/r/${encodeURIComponent(restaurant.slug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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

                  <AdminActionButton
                    variant="secondary"
                    icon={<SlidersHorizontal size={17} aria-hidden="true" />}
                    onClick={() => openControlsModal(restaurant)}
                  >
                    إدارة الباقة
                  </AdminActionButton>
                  <AdminActionButton
                    variant="secondary"
                    icon={<Globe2 size={17} aria-hidden="true" />}
                    onClick={() => openDomainModal(restaurant)}
                  >
                    إدارة الدومين
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

      <AdminFormModal
        isOpen={Boolean(domainRestaurant && domainValues)}
        title="إدارة الدومين"
        description={
          domainRestaurant
            ? `إدارة بيانات رابط ${domainRestaurant.nameAr || domainRestaurant.name}. هذه المرحلة لا تفعل DNS أو routing حقيقي.`
            : "إدارة بيانات رابط العميل."
        }
        onClose={closeDomainModal}
        size="lg"
      >
        {domainValues && domainRestaurant ? (
          <form className="admin-dish-form" onSubmit={handleDomainSubmit} noValidate>
            {domainError ? <div className="admin-feedback admin-feedback--error">{domainError}</div> : null}

            <div className="admin-form-grid">
              <label>
                <span>نوع الرابط</span>
                <select
                  value={domainValues.domainType}
                  onChange={(event) => updateDomainValue("domainType", event.target.value as DomainType)}
                  aria-invalid={Boolean(domainErrors.domainType)}
                >
                  {domainTypes.map((type) => (
                    <option value={type} key={type}>
                      {domainTypeLabels[type]}
                    </option>
                  ))}
                </select>
                {domainErrors.domainType ? <small>{domainErrors.domainType}</small> : null}
              </label>

              <label>
                <span>حالة الدومين</span>
                <select
                  value={domainValues.domainStatus}
                  onChange={(event) => updateDomainValue("domainStatus", event.target.value as DomainStatus)}
                  aria-invalid={Boolean(domainErrors.domainStatus)}
                >
                  {domainStatuses.map((status) => (
                    <option value={status} key={status}>
                      {domainStatusLabels[status]}
                    </option>
                  ))}
                </select>
                {domainErrors.domainStatus ? <small>{domainErrors.domainStatus}</small> : null}
              </label>

              <label>
                <span>Subdomain</span>
                <input
                  value={domainValues.subdomain}
                  onChange={(event) => updateDomainValue("subdomain", event.target.value.trim().toLowerCase())}
                  aria-invalid={Boolean(domainErrors.subdomain)}
                  dir="ltr"
                  placeholder="pizza-rabat"
                />
                {domainErrors.subdomain ? <small>{domainErrors.subdomain}</small> : null}
              </label>

              <label>
                <span>Custom domain</span>
                <input
                  value={domainValues.customDomain}
                  onChange={(event) => updateDomainValue("customDomain", event.target.value.trim().toLowerCase())}
                  aria-invalid={Boolean(domainErrors.customDomain)}
                  dir="ltr"
                  placeholder="www.pizzarabat.ma"
                />
                {domainErrors.customDomain ? <small>{domainErrors.customDomain}</small> : null}
              </label>

              <label>
                <span>DNS target</span>
                <input
                  value={domainValues.dnsTarget}
                  onChange={(event) => updateDomainValue("dnsTarget", event.target.value)}
                  dir="ltr"
                  placeholder="سيتم تحديده بعد اختيار الاستضافة النهائية"
                />
              </label>

              <label>
                <span>وقت التحقق</span>
                <input
                  type="datetime-local"
                  value={domainValues.domainVerifiedAt}
                  onChange={(event) => updateDomainValue("domainVerifiedAt", event.target.value)}
                />
              </label>

              <label className="admin-form-grid__wide">
                <span>ملاحظات داخلية</span>
                <textarea
                  value={domainValues.domainNotes}
                  onChange={(event) => updateDomainValue("domainNotes", event.target.value)}
                  rows={3}
                />
              </label>

              <div className="agency-plan-summary admin-form-grid__wide">
                <span>معاينة الرابط</span>
                <strong dir="ltr">{getPlannedDomainPreview(domainValues, domainRestaurant.slug)}</strong>
                <p>
                  الرابط العامل حاليًا هو {getPublicPreviewPath(domainRestaurant)}. الدومينات المخصصة محفوظة للتجهيز وستعمل بعد تفعيل DNS/Resolver.
                </p>
                <p>
                  روابط subdomain/custom domain المعروضة هنا مخططة فقط وليست مفعلة للتوجيه العام بعد.
                </p>
              </div>

              <div className="agency-plan-summary admin-form-grid__wide">
                <span>تعليمات مبدئية</span>
                {domainValues.domainType === "subdomain" ? (
                  <p>
                    هذا الخيار يحتاج لاحقًا إعداد wildcard domain مثل *.pixelonevisuals.tech. حاليًا الرابط الرسمي المتاح هو{" "}
                    {getPublicPreviewPath(domainRestaurant)}.
                  </p>
                ) : null}
                {domainValues.domainType === "custom_domain" ? (
                  <p>
                    يتطلب هذا الخيار إعداد DNS لدى مزود الدومين. أضف CNAME من www إلى target الذي سنحدده بعد تثبيت الاستضافة، أو اتبع تعليمات منصة الاستضافة عند التفعيل.
                  </p>
                ) : null}
                {domainValues.domainType === "pixelone_path" ? (
                  <p>هذا هو الرابط المجاني الحالي داخل المنصة ولا يحتاج إعداد DNS.</p>
                ) : null}
              </div>
            </div>

            <div className="admin-dish-form__actions">
              <AdminActionButton variant="ghost" onClick={closeDomainModal} disabled={isSavingDomain}>
                إلغاء
              </AdminActionButton>
              <AdminActionButton variant="primary" type="submit" disabled={isSavingDomain}>
                {isSavingDomain ? "جارٍ الحفظ..." : "حفظ إعدادات الدومين"}
              </AdminActionButton>
            </div>
          </form>
        ) : null}
      </AdminFormModal>

      <AdminFormModal
        isOpen={Boolean(controlsRestaurant && controlsValues)}
        title="إدارة الباقة"
        description={
          controlsRestaurant
            ? `تحكم يدويًا في خطة وحالة ${controlsRestaurant.nameAr || controlsRestaurant.name}. لا يتم إنشاء أي دفع أو فاتورة هنا.`
            : "تحكم يدويًا في خطة وحالة العميل."
        }
        onClose={closeControlsModal}
        size="lg"
      >
        {controlsValues ? (
          <form className="admin-dish-form" onSubmit={handleControlsSubmit} noValidate>
            {controlsError ? <div className="admin-feedback admin-feedback--error">{controlsError}</div> : null}

            <div className="admin-form-grid">
              <label>
                <span>حالة الموقع</span>
                <select
                  value={controlsValues.status}
                  onChange={(event) => updateControlsValue("status", event.target.value as RestaurantStatus)}
                >
                  {(["draft", "active", "suspended", "cancelled"] as const).map((status) => (
                    <option value={status} key={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>الباقة</span>
                <select
                  value={controlsValues.plan}
                  onChange={(event) => updateControlsValue("plan", event.target.value as ClientPlan)}
                >
                  {clientPlans.map((plan) => (
                    <option value={plan} key={plan}>
                      {planLabels[plan]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>حالة الدفع</span>
                <select
                  value={controlsValues.billingStatus}
                  onChange={(event) => updateControlsValue("billingStatus", event.target.value as BillingStatus)}
                >
                  {billingStatuses.map((status) => (
                    <option value={status} key={status}>
                      {billingStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>مستوى الدعم</span>
                <select
                  value={controlsValues.supportLevel}
                  onChange={(event) => updateControlsValue("supportLevel", event.target.value as SupportLevel)}
                >
                  {supportLevels.map((level) => (
                    <option value={level} key={level}>
                      {supportLevelLabels[level]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>نهاية الاشتراك</span>
                <input
                  type="datetime-local"
                  value={controlsValues.subscriptionEndsAt}
                  onChange={(event) => updateControlsValue("subscriptionEndsAt", event.target.value)}
                />
              </label>

              <label>
                <span>نهاية التجربة</span>
                <input
                  type="datetime-local"
                  value={controlsValues.trialEndsAt}
                  onChange={(event) => updateControlsValue("trialEndsAt", event.target.value)}
                />
              </label>

              <div className="agency-plan-summary admin-form-grid__wide">
                <span>ميزات الباقة الحالية</span>
                <strong>{planDefinitions[controlsValues.plan].label}</strong>
                <p>
                  {Object.values(planDefinitions[controlsValues.plan].features).filter(Boolean).length} ميزات مفعلة من أصل{" "}
                  {Object.values(planDefinitions[controlsValues.plan].features).length}.
                </p>
              </div>
            </div>

            <div className="admin-dish-form__actions">
              <AdminActionButton variant="ghost" onClick={closeControlsModal} disabled={isSavingControls}>
                إلغاء
              </AdminActionButton>
              <AdminActionButton variant="primary" type="submit" disabled={isSavingControls}>
                {isSavingControls ? "جارٍ الحفظ..." : "حفظ"}
              </AdminActionButton>
            </div>
          </form>
        ) : null}
      </AdminFormModal>
    </main>
  );
}
