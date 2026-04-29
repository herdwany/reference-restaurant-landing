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
import { mapKnownErrorToFriendlyMessage } from "../lib/friendlyErrors";
import { useI18n } from "../lib/i18n/I18nContext";
import { clientPlans, getDefaultSupportLevelForPlan, planDefinitions } from "../lib/plans";
import {
  createClientViaFunction,
  hasCreateClientFunctionConfig,
  type CreateClientInput,
} from "../services/appwrite/clientOnboardingService";
import {
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

type UiKey = Parameters<ReturnType<typeof useI18n>["t"]>[0];

const statusLabelKeys: Record<StatusFilter, UiKey> = {
  active: "clientStatusActive",
  all: "all",
  cancelled: "clientStatusCancelled",
  draft: "clientStatusDraft",
  suspended: "clientStatusSuspended",
};

const planLabelKeys: Record<ClientPlan, UiKey> = {
  starter: "planStarter",
  pro: "planPro",
  premium: "planPremium",
  managed: "planManaged",
};

const billingStatusLabelKeys: Record<BillingStatus, UiKey> = {
  trial: "billingStatusTrial",
  active: "billingStatusActive",
  overdue: "billingStatusOverdue",
  cancelled: "billingStatusCancelled",
};

const supportLevelLabelKeys: Record<SupportLevel, UiKey> = {
  basic: "supportBasic",
  standard: "supportStandard",
  priority: "supportPriority",
  managed: "supportManaged",
};

const domainTypeLabelKeys: Record<DomainType, UiKey> = {
  pixelone_path: "domainTypePixelonePath",
  subdomain: "domainTypeSubdomain",
  custom_domain: "domainTypeCustomDomain",
};

const domainStatusLabelKeys: Record<DomainStatus, UiKey> = {
  not_configured: "domainStatusNotConfigured",
  pending_dns: "domainStatusPendingDns",
  pending_verification: "domainStatusPendingVerification",
  active: "domainStatusActive",
  failed: "domainStatusFailed",
};

const businessTypeLabelKeys: Record<BusinessType, UiKey> = {
  bakery: "businessBakery",
  cafe: "businessCafe",
  car_rental: "businessCarRental",
  cloud_kitchen: "businessCloudKitchen",
  clinic: "businessClinic",
  gym: "businessGym",
  other: "businessOther",
  restaurant: "businessRestaurant",
  salon: "businessSalon",
};

const onboardingStatusLabelKeys: Record<OnboardingStatus, UiKey> = {
  active: "clientStatusActive",
  draft: "clientStatusDraft",
};

const onboardingPlanLabelKeys: Record<OnboardingPlan, UiKey> = {
  managed: "planManaged",
  premium: "planPremium",
  pro: "planPro",
  starter: "planStarter",
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
  const { direction, t } = useI18n();
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
            {t("login")}
          </Link>
        ) : null}
      </section>
    </main>
  );
}

const getErrorMessage = (error: unknown, t: ReturnType<typeof useI18n>["t"]) => mapKnownErrorToFriendlyMessage(error, t);

const formatDate = (value: string | undefined, language: string, fallback: string) => {
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
  restaurant.slug ? `/r/${restaurant.slug}` : "";

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

const validateCreateClientForm = (
  values: CreateClientFormValues,
  messages: { invalidValue: string; requiredField: string },
): CreateClientFormErrors => {
  const errors: CreateClientFormErrors = {};

  if (!values.restaurantName.trim()) {
    errors.restaurantName = messages.requiredField;
  }

  if (!values.slug.trim()) {
    errors.slug = messages.requiredField;
  } else if (!isValidSlug(values.slug.trim())) {
    errors.slug = messages.invalidValue;
  }

  if (!onboardingBusinessTypes.includes(values.businessType)) {
    errors.businessType = messages.invalidValue;
  }

  if (!values.ownerName.trim()) {
    errors.ownerName = messages.requiredField;
  }

  if (!values.ownerEmail.trim()) {
    errors.ownerEmail = messages.requiredField;
  } else if (!isValidEmail(values.ownerEmail.trim())) {
    errors.ownerEmail = messages.invalidValue;
  }

  if (!isValidOptionalPhone(values.ownerPhone)) {
    errors.ownerPhone = messages.invalidValue;
  }

  if (!values.temporaryPassword.trim()) {
    errors.temporaryPassword = messages.requiredField;
  } else if (values.temporaryPassword.length < 8) {
    errors.temporaryPassword = messages.invalidValue;
  }

  if (!onboardingStatuses.includes(values.status)) {
    errors.status = messages.invalidValue;
  }

  if (!onboardingPlans.includes(values.plan)) {
    errors.plan = messages.invalidValue;
  }

  return errors;
};

const validateDomainForm = (
  values: AgencyDomainFormValues,
  messages: { invalidValue: string; requiredField: string },
): AgencyDomainFormErrors => {
  const errors: AgencyDomainFormErrors = {};
  const subdomain = values.subdomain.trim().toLowerCase();
  const customDomain = values.customDomain.trim().toLowerCase().replace(/\.$/, "");

  if (!domainTypes.includes(values.domainType)) {
    errors.domainType = messages.invalidValue;
  }

  if (!domainStatuses.includes(values.domainStatus)) {
    errors.domainStatus = messages.invalidValue;
  }

  if (values.domainType === "subdomain" && !subdomain) {
    errors.subdomain = messages.requiredField;
  } else if (subdomain && !isValidSubdomain(subdomain)) {
    errors.subdomain = messages.invalidValue;
  }

  if (values.domainType === "custom_domain" && !customDomain) {
    errors.customDomain = messages.requiredField;
  } else if (customDomain && !isValidCustomDomain(customDomain)) {
    errors.customDomain = messages.invalidValue;
  }

  return errors;
};

const getControlsErrorMessage = (error: unknown, t: ReturnType<typeof useI18n>["t"]) => mapKnownErrorToFriendlyMessage(error, t);

const getDomainErrorMessage = (error: unknown, t: ReturnType<typeof useI18n>["t"]) => mapKnownErrorToFriendlyMessage(error, t);

export default function AgencyDashboard() {
  const { currentLanguage, direction, t } = useI18n();
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
      setPageError(getErrorMessage(error, t));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
        title={t("appwriteSetupRequired")}
        body={t("contactSupport")}
      />
    );
  }

  if (isAuthLoading) {
    return (
      <AgencyStatusMessage
        title={t("loading")}
        body={t("loading")}
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
        title={t("accessDenied")}
        body={role === "owner" || role === "staff" ? t("dashboard") : t("contactSupport")}
        action={
          <Link className="admin-primary-link" to="/admin">
            {t("dashboard")}
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

      setControlsSuccess(t("planUpdatedSuccess"));
      setControlsRestaurant(null);
      setControlsValues(null);
    } catch (error) {
      setControlsError(getControlsErrorMessage(error, t));
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
    const nextErrors = validateDomainForm(normalizedValues, {
      invalidValue: t("invalidValue"),
      requiredField: t("requiredField"),
    });
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
      setDomainSuccess(t("domainUpdatedSuccess"));
      setDomainRestaurant(null);
      setDomainValues(null);
    } catch (error) {
      setDomainError(getDomainErrorMessage(error, t));
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

  const getCreateClientErrorMessage = (error: unknown) => mapKnownErrorToFriendlyMessage(error, t);

  const handleCreateClientSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateClientError(null);
    setCreateClientSuccess(null);

    if (!hasCreateClientFunctionConfig) {
      setCreateClientError(t("appwriteSetupRequired"));
      return;
    }

    const normalizedValues = {
      ...createClientValues,
      ownerEmail: createClientValues.ownerEmail.trim().toLowerCase(),
      slug: normalizeSlugInput(createClientValues.slug),
    };
    const nextErrors = validateCreateClientForm(normalizedValues, {
      invalidValue: t("invalidValue"),
      requiredField: t("requiredField"),
    });
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
          ? `${t("clientUpdatedSuccess")} ${result.warning}`
          : t("clientUpdatedSuccess"),
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
          <p>{t("agencyDescription")}</p>
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
              <span>{t("clearSelection")}</span>
            </button>
          ) : null}
          <Link className="admin-icon-link" to="/">
            {t("previewSite")}
          </Link>
        </div>
      </header>

      {selectedRestaurant ? (
      <section className="agency-selection-banner" aria-label={t("currentSelection")}>
          <div>
            <span>{t("currentSelection")}</span>
            <strong>{selectedRestaurant.selectedRestaurantName}</strong>
            <code>{selectedRestaurant.selectedRestaurantSlug}</code>
          </div>
          <Link className="admin-primary-link" to="/admin">
            {t("openClientDashboard")}
          </Link>
        </section>
      ) : null}

      <section className="agency-stats" aria-label={t("clientSites")}>
        <div>
          <span>{t("totalSites")}</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>{t("activeClients")}</span>
          <strong>{stats.active}</strong>
        </div>
        <div>
          <span>{t("suspendedClients")}</span>
          <strong>{stats.suspended}</strong>
        </div>
        <div>
          <span>{t("draftClients")}</span>
          <strong>{stats.draft}</strong>
        </div>
        <div>
          <span>{t("cancelledClients")}</span>
          <strong>{stats.cancelled}</strong>
        </div>
      </section>

      {createClientSuccess ? <div className="admin-feedback admin-feedback--success">{createClientSuccess}</div> : null}
      {controlsSuccess ? <div className="admin-feedback admin-feedback--success">{controlsSuccess}</div> : null}
      {domainSuccess ? <div className="admin-feedback admin-feedback--success">{domainSuccess}</div> : null}

      <section className="agency-toolbar" aria-label={t("search")}>
        <label className="agency-search">
          <Search size={18} aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("searchClientsPlaceholder")}
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
              {t(statusLabelKeys[filter])}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? <AdminLoadingState label={t("loading")} /> : null}

      {!isLoading && pageError ? (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadRestaurants()}>
              {t("tryAgain")}
            </AdminActionButton>
          }
        />
      ) : null}

      {!isLoading && !pageError && restaurants.length === 0 ? (
        <AdminEmptyState
          icon={<Building2 size={30} aria-hidden="true" />}
          title={t("noData")}
          body={t("clientSites")}
        />
      ) : null}

      {!isLoading && !pageError && restaurants.length > 0 && filteredRestaurants.length === 0 ? (
        <AdminEmptyState
          icon={<Search size={30} aria-hidden="true" />}
          title={t("noData")}
          body={t("tryAgain")}
        />
      ) : null}

      {!isLoading && !pageError && filteredRestaurants.length > 0 ? (
        <section className="agency-restaurant-grid" aria-label={t("clientSites")}>
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
                    {isSelected ? <span className="agency-current-selection">{t("selectedNow")}</span> : null}
                    <span className="agency-plan-badge">{t(planLabelKeys[restaurant.plan])}</span>
                    <span className={`agency-status agency-status--${restaurant.status}`}>{t(statusLabelKeys[restaurant.status])}</span>
                  </div>
                </div>

                <div className="agency-restaurant-card__meta">
                  <div>
                    <span>{t("businessType")}</span>
                    <strong>{businessTypeLabelKeys[restaurant.businessType] ? t(businessTypeLabelKeys[restaurant.businessType]) : restaurant.businessType}</strong>
                  </div>
                  <div>
                    <span>Owner User ID</span>
                    <strong>{restaurant.ownerUserId || t("notAvailable")}</strong>
                  </div>
                  <div>
                    <span>{t("plan")}</span>
                    <strong>{t(planLabelKeys[restaurant.plan])}</strong>
                  </div>
                  <div>
                    <span>{t("billingStatus")}</span>
                    <strong>{t(billingStatusLabelKeys[restaurant.billingStatus])}</strong>
                  </div>
                  <div>
                    <span>{t("supportLevel")}</span>
                    <strong>{t(supportLevelLabelKeys[restaurant.supportLevel])}</strong>
                  </div>
                  <div>
                    <span>{t("subscriptionEndsAt")}</span>
                    <strong>{formatDate(restaurant.subscriptionEndsAt, currentLanguage, t("notAvailable"))}</strong>
                  </div>
                  <div>
                    <span>{t("createdAt")}</span>
                    <strong>{formatDate(restaurant.createdAt, currentLanguage, t("notAvailable"))}</strong>
                  </div>
                  <div>
                    <span>{t("currentLink")}</span>
                    <strong dir="ltr">{getPublicPreviewPath(restaurant)}</strong>
                  </div>
                  <div>
                    <span>{t("domainType")}</span>
                    <strong>{t(domainTypeLabelKeys[restaurant.domainType])}</strong>
                  </div>
                  <div>
                    <span>{t("domainStatus")}</span>
                    <strong>{t(domainStatusLabelKeys[restaurant.domainStatus])}</strong>
                  </div>
                  <div>
                    <span>{t("plannedLink")}</span>
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
                      <span>{t("previewSite")}</span>
                    </a>
                  ) : (
                    <button className="admin-action-button admin-action-button--secondary" type="button" disabled>
                      <ExternalLink size={17} aria-hidden="true" />
                      <span>{t("previewSite")}</span>
                    </button>
                  )}

                  <AdminActionButton variant="primary" onClick={() => openClientAdmin(restaurant)}>
                    {t("openClientDashboard")}
                  </AdminActionButton>

                  <AdminActionButton
                    variant="secondary"
                    icon={<SlidersHorizontal size={17} aria-hidden="true" />}
                    onClick={() => openControlsModal(restaurant)}
                  >
                    {t("managePlan")}
                  </AdminActionButton>
                  <AdminActionButton
                    variant="secondary"
                    icon={<Globe2 size={17} aria-hidden="true" />}
                    onClick={() => openDomainModal(restaurant)}
                  >
                    {t("manageDomain")}
                  </AdminActionButton>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      <AdminFormModal
        isOpen={isCreateModalOpen}
        title={t("addClient")}
        description={t("createClient")}
        onClose={closeCreateClientModal}
        size="lg"
      >
        <form className="admin-dish-form" onSubmit={handleCreateClientSubmit} noValidate>
          {!hasCreateClientFunctionConfig ? (
            <div className="admin-feedback admin-feedback--error">
              {t("appwriteSetupRequired")}
            </div>
          ) : null}
          {createClientError ? <div className="admin-feedback admin-feedback--error">{createClientError}</div> : null}

          <div className="admin-form-grid">
            <label>
              <span>{t("restaurant")}</span>
              <input
                value={createClientValues.restaurantName}
                onChange={(event) => updateCreateClientValue("restaurantName", event.target.value)}
                aria-invalid={Boolean(createClientErrors.restaurantName)}
              />
              {createClientErrors.restaurantName ? <small>{createClientErrors.restaurantName}</small> : null}
            </label>

            <label>
              <span>{t("restaurant")} ar</span>
              <input
                value={createClientValues.restaurantNameAr}
                onChange={(event) => updateCreateClientValue("restaurantNameAr", event.target.value)}
              />
            </label>

            <label>
              <span>{t("clientSlug")}</span>
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
              <span>{t("businessType")}</span>
              <select
                value={createClientValues.businessType}
                onChange={(event) => updateCreateClientValue("businessType", event.target.value as OnboardingBusinessType)}
                aria-invalid={Boolean(createClientErrors.businessType)}
              >
                {onboardingBusinessTypes.map((type) => (
                  <option value={type} key={type}>
                    {t(businessTypeLabelKeys[type])}
                  </option>
                ))}
              </select>
              {createClientErrors.businessType ? <small>{createClientErrors.businessType}</small> : null}
            </label>

            <label>
              <span>{t("ownerName")}</span>
              <input
                value={createClientValues.ownerName}
                onChange={(event) => updateCreateClientValue("ownerName", event.target.value)}
                aria-invalid={Boolean(createClientErrors.ownerName)}
              />
              {createClientErrors.ownerName ? <small>{createClientErrors.ownerName}</small> : null}
            </label>

            <label>
              <span>{t("ownerEmail")}</span>
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
              <span>{t("ownerPhone")}</span>
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
              <span>{t("temporaryPassword")}</span>
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
              <span>{t("status")}</span>
              <select
                value={createClientValues.status}
                onChange={(event) => updateCreateClientValue("status", event.target.value as OnboardingStatus)}
                aria-invalid={Boolean(createClientErrors.status)}
              >
                {onboardingStatuses.map((status) => (
                  <option value={status} key={status}>
                    {t(onboardingStatusLabelKeys[status])}
                  </option>
                ))}
              </select>
              {createClientErrors.status ? <small>{createClientErrors.status}</small> : null}
            </label>

            <label>
              <span>{t("plan")}</span>
              <select
                value={createClientValues.plan}
                onChange={(event) => updateCreateClientValue("plan", event.target.value as OnboardingPlan)}
                aria-invalid={Boolean(createClientErrors.plan)}
              >
                {onboardingPlans.map((plan) => (
                  <option value={plan} key={plan || "none"}>
                    {t(onboardingPlanLabelKeys[plan])}
                  </option>
                ))}
              </select>
              {createClientErrors.plan ? <small>{createClientErrors.plan}</small> : null}
            </label>

            <label className="admin-form-grid__wide">
              <span>{t("internalNotes")}</span>
              <textarea
                value={createClientValues.notes}
                onChange={(event) => updateCreateClientValue("notes", event.target.value)}
                rows={3}
              />
            </label>
          </div>

          <div className="admin-dish-form__actions">
            <AdminActionButton variant="ghost" onClick={closeCreateClientModal} disabled={isCreatingClient}>
              {t("cancel")}
            </AdminActionButton>
            <AdminActionButton variant="primary" type="submit" disabled={isCreatingClient || !hasCreateClientFunctionConfig}>
              {isCreatingClient ? t("creating") : t("createClient")}
            </AdminActionButton>
          </div>
        </form>
      </AdminFormModal>

      <AdminFormModal
        isOpen={Boolean(domainRestaurant && domainValues)}
        title={t("manageDomain")}
        description={t("domainUpdatedSuccess")}
        onClose={closeDomainModal}
        size="lg"
      >
        {domainValues && domainRestaurant ? (
          <form className="admin-dish-form" onSubmit={handleDomainSubmit} noValidate>
            {domainError ? <div className="admin-feedback admin-feedback--error">{domainError}</div> : null}

            <div className="admin-form-grid">
              <label>
                <span>{t("domainType")}</span>
                <select
                  value={domainValues.domainType}
                  onChange={(event) => updateDomainValue("domainType", event.target.value as DomainType)}
                  aria-invalid={Boolean(domainErrors.domainType)}
                >
                  {domainTypes.map((type) => (
                    <option value={type} key={type}>
                      {t(domainTypeLabelKeys[type])}
                    </option>
                  ))}
                </select>
                {domainErrors.domainType ? <small>{domainErrors.domainType}</small> : null}
              </label>

              <label>
                <span>{t("domainStatus")}</span>
                <select
                  value={domainValues.domainStatus}
                  onChange={(event) => updateDomainValue("domainStatus", event.target.value as DomainStatus)}
                  aria-invalid={Boolean(domainErrors.domainStatus)}
                >
                  {domainStatuses.map((status) => (
                    <option value={status} key={status}>
                      {t(domainStatusLabelKeys[status])}
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
                  placeholder={t("notAvailable")}
                />
              </label>

              <label>
                <span>{t("verificationTime")}</span>
                <input
                  type="datetime-local"
                  value={domainValues.domainVerifiedAt}
                  onChange={(event) => updateDomainValue("domainVerifiedAt", event.target.value)}
                />
              </label>

              <label className="admin-form-grid__wide">
                <span>{t("internalNotes")}</span>
                <textarea
                  value={domainValues.domainNotes}
                  onChange={(event) => updateDomainValue("domainNotes", event.target.value)}
                  rows={3}
                />
              </label>

              <div className="agency-plan-summary admin-form-grid__wide">
                <span>{t("previewLink")}</span>
                <strong dir="ltr">{getPlannedDomainPreview(domainValues, domainRestaurant.slug)}</strong>
                <p>
                  {t("currentLink")}: {getPublicPreviewPath(domainRestaurant) || t("notAvailable")}.
                </p>
                <p>
                  {t("domainUpdatedSuccess")}
                </p>
              </div>

              <div className="agency-plan-summary admin-form-grid__wide">
                <span>{t("initialInstructions")}</span>
                {domainValues.domainType === "subdomain" ? (
                  <p>
                    {t("domainUpdatedSuccess")}{" "}
                    {getPublicPreviewPath(domainRestaurant)}.
                  </p>
                ) : null}
                {domainValues.domainType === "custom_domain" ? (
                  <p>
                    {t("domainUpdatedSuccess")}
                  </p>
                ) : null}
                {domainValues.domainType === "pixelone_path" ? (
                  <p>{t("domainUpdatedSuccess")}</p>
                ) : null}
              </div>
            </div>

            <div className="admin-dish-form__actions">
              <AdminActionButton variant="ghost" onClick={closeDomainModal} disabled={isSavingDomain}>
                {t("cancel")}
              </AdminActionButton>
              <AdminActionButton variant="primary" type="submit" disabled={isSavingDomain}>
                {isSavingDomain ? t("saving") : t("saveDomainSettings")}
              </AdminActionButton>
            </div>
          </form>
        ) : null}
      </AdminFormModal>

      <AdminFormModal
        isOpen={Boolean(controlsRestaurant && controlsValues)}
        title={t("managePlan")}
        description={t("planUpdatedSuccess")}
        onClose={closeControlsModal}
        size="lg"
      >
        {controlsValues ? (
          <form className="admin-dish-form" onSubmit={handleControlsSubmit} noValidate>
            {controlsError ? <div className="admin-feedback admin-feedback--error">{controlsError}</div> : null}

            <div className="admin-form-grid">
              <label>
                <span>{t("status")}</span>
                <select
                  value={controlsValues.status}
                  onChange={(event) => updateControlsValue("status", event.target.value as RestaurantStatus)}
                >
                  {(["draft", "active", "suspended", "cancelled"] as const).map((status) => (
                    <option value={status} key={status}>
                      {t(statusLabelKeys[status])}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{t("plan")}</span>
                <select
                  value={controlsValues.plan}
                  onChange={(event) => updateControlsValue("plan", event.target.value as ClientPlan)}
                >
                  {clientPlans.map((plan) => (
                    <option value={plan} key={plan}>
                      {t(planLabelKeys[plan])}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{t("billingStatus")}</span>
                <select
                  value={controlsValues.billingStatus}
                  onChange={(event) => updateControlsValue("billingStatus", event.target.value as BillingStatus)}
                >
                  {billingStatuses.map((status) => (
                    <option value={status} key={status}>
                      {t(billingStatusLabelKeys[status])}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{t("supportLevel")}</span>
                <select
                  value={controlsValues.supportLevel}
                  onChange={(event) => updateControlsValue("supportLevel", event.target.value as SupportLevel)}
                >
                  {supportLevels.map((level) => (
                    <option value={level} key={level}>
                      {t(supportLevelLabelKeys[level])}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{t("subscriptionEndsAt")}</span>
                <input
                  type="datetime-local"
                  value={controlsValues.subscriptionEndsAt}
                  onChange={(event) => updateControlsValue("subscriptionEndsAt", event.target.value)}
                />
              </label>

              <label>
                <span>{t("trialEndsAt")}</span>
                <input
                  type="datetime-local"
                  value={controlsValues.trialEndsAt}
                  onChange={(event) => updateControlsValue("trialEndsAt", event.target.value)}
                />
              </label>

              <div className="agency-plan-summary admin-form-grid__wide">
                <span>{t("planFeatures")}</span>
                <strong>{planDefinitions[controlsValues.plan].label}</strong>
                <p>
                  {t("enabledFeaturesCount")
                    .replace("{enabled}", String(Object.values(planDefinitions[controlsValues.plan].features).filter(Boolean).length))
                    .replace("{total}", String(Object.values(planDefinitions[controlsValues.plan].features).length))}
                </p>
              </div>
            </div>

            <div className="admin-dish-form__actions">
              <AdminActionButton variant="ghost" onClick={closeControlsModal} disabled={isSavingControls}>
                {t("cancel")}
              </AdminActionButton>
              <AdminActionButton variant="primary" type="submit" disabled={isSavingControls}>
                {isSavingControls ? t("saving") : t("save")}
              </AdminActionButton>
            </div>
          </form>
        ) : null}
      </AdminFormModal>
    </main>
  );
}
