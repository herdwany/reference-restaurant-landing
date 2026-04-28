import { FormEvent, useCallback, useEffect, useState } from "react";
import { ImageIcon, RefreshCw, Save, Settings } from "lucide-react";
import AdminActionButton from "../components/AdminActionButton";
import AdminCard from "../components/AdminCard";
import AdminErrorState from "../components/AdminErrorState";
import AdminImageUploader from "../components/AdminImageUploader";
import AdminLoadingState from "../components/AdminLoadingState";
import AdminPageHeader from "../components/AdminPageHeader";
import { useActiveRestaurantScope } from "../hooks/useActiveRestaurantScope";
import { useAuditLogger } from "../hooks/useAuditLogger";
import { useAuth } from "../../context/AuthContext";
import { defaultRestaurantConfig } from "../../data/restaurantConfig";
import {
  RestaurantRepositoryError,
  getRestaurantById,
  updateRestaurantContact,
  type RestaurantContactInput,
} from "../../services/repositories/restaurantRepository";
import {
  SettingsRepositoryError,
  getSiteSettings,
  upsertSiteSettings,
  type SiteSettingsMutationInput,
} from "../../services/repositories/settingsRepository";
import { getFileViewUrl } from "../../services/appwrite/storageService";
import type { OrderMode, ReservationMode, Restaurant, SiteDirection, SiteSettings } from "../../types/platform";

type SettingsFormValues = {
  name: string;
  nameAr: string;
  tagline: string;
  description: string;
  logoFileId: string;
  logoPreviewUrl: string;
  heroImageFileId: string;
  heroImageUrl: string;
  heroPreviewUrl: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  mapsUrl: string;
  workingHours: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  currency: string;
  language: string;
  direction: SiteDirection;
  orderMode: OrderMode;
  reservationMode: ReservationMode;
  showHero: boolean;
  showTrustBadges: boolean;
  showFeaturedDishes: boolean;
  showOffers: boolean;
  showGallery: boolean;
  showTestimonials: boolean;
  showActionGrid: boolean;
  showFaq: boolean;
  showFooter: boolean;
};

type SettingsFormErrors = Partial<Record<keyof SettingsFormValues, string>>;

const orderModes = ["whatsapp", "database", "both"] as const satisfies readonly OrderMode[];
const reservationModes = ["whatsapp", "database", "both"] as const satisfies readonly ReservationMode[];
const directions = ["rtl", "ltr"] as const satisfies readonly SiteDirection[];

const modeLabels: Record<OrderMode | ReservationMode, string> = {
  whatsapp: "واتساب",
  database: "قاعدة البيانات",
  both: "واتساب + قاعدة البيانات",
};

const sectionToggles = [
  { key: "showHero", label: "Hero" },
  { key: "showTrustBadges", label: "شارات الثقة" },
  { key: "showFeaturedDishes", label: "الأطباق المميزة" },
  { key: "showOffers", label: "العروض" },
  { key: "showGallery", label: "المعرض" },
  { key: "showTestimonials", label: "آراء العملاء" },
  { key: "showActionGrid", label: "الحجز والتواصل" },
  { key: "showFaq", label: "الأسئلة الشائعة" },
  { key: "showFooter", label: "الفوتر" },
] as const satisfies readonly { key: keyof Pick<
  SettingsFormValues,
  | "showHero"
  | "showTrustBadges"
  | "showFeaturedDishes"
  | "showOffers"
  | "showGallery"
  | "showTestimonials"
  | "showActionGrid"
  | "showFaq"
  | "showFooter"
>; label: string }[];

const emptySettingsFormValues: SettingsFormValues = {
  name: defaultRestaurantConfig.restaurant.name,
  nameAr: defaultRestaurantConfig.restaurant.name,
  tagline: defaultRestaurantConfig.restaurant.slogan,
  description: defaultRestaurantConfig.ui.footer.description,
  logoFileId: "",
  logoPreviewUrl: "",
  heroImageFileId: "",
  heroImageUrl: "",
  heroPreviewUrl: "",
  phone: defaultRestaurantConfig.restaurant.phone,
  whatsappNumber: defaultRestaurantConfig.restaurant.whatsappNumber,
  email: defaultRestaurantConfig.restaurant.email,
  address: defaultRestaurantConfig.restaurant.address,
  mapsUrl: defaultRestaurantConfig.restaurant.mapUrl,
  workingHours: defaultRestaurantConfig.restaurant.workingHours,
  primaryColor: defaultRestaurantConfig.brand.primaryColor,
  secondaryColor: defaultRestaurantConfig.brand.secondaryColor,
  accentColor: defaultRestaurantConfig.brand.accentColor,
  successColor: defaultRestaurantConfig.brand.successColor,
  currency: defaultRestaurantConfig.restaurant.currency || "د.م",
  language: "ar",
  direction: "rtl",
  orderMode: "whatsapp",
  reservationMode: "whatsapp",
  showHero: defaultRestaurantConfig.settings.sections.hero,
  showTrustBadges: defaultRestaurantConfig.settings.sections.trustBadges,
  showFeaturedDishes: defaultRestaurantConfig.settings.sections.featuredDishes,
  showOffers: defaultRestaurantConfig.settings.sections.offers,
  showGallery: defaultRestaurantConfig.settings.sections.gallery,
  showTestimonials: defaultRestaurantConfig.settings.sections.testimonials,
  showActionGrid: defaultRestaurantConfig.settings.sections.actionGrid,
  showFaq: defaultRestaurantConfig.settings.sections.faq,
  showFooter: defaultRestaurantConfig.settings.sections.footer,
};

const getStoredFileUrl = (fileId: string | undefined) => {
  if (!fileId) {
    return "";
  }

  try {
    return getFileViewUrl(fileId);
  } catch {
    return "";
  }
};

const getSettingsFormValues = (restaurant: Restaurant | null, settings: SiteSettings | null): SettingsFormValues => {
  const restaurantName = restaurant?.name || restaurant?.nameAr || emptySettingsFormValues.name;
  const restaurantNameAr = restaurant?.nameAr || restaurantName;
  const logoFileId = restaurant?.logoFileId ?? "";
  const heroImageFileId = restaurant?.heroImageFileId ?? "";

  return {
    name: restaurantName,
    nameAr: restaurantNameAr,
    tagline: restaurant?.tagline ?? emptySettingsFormValues.tagline,
    description: restaurant?.description ?? emptySettingsFormValues.description,
    logoFileId,
    logoPreviewUrl: getStoredFileUrl(logoFileId),
    heroImageFileId,
    heroImageUrl: restaurant?.heroImageUrl ?? emptySettingsFormValues.heroImageUrl,
    heroPreviewUrl: getStoredFileUrl(heroImageFileId),
    phone: restaurant?.phone ?? emptySettingsFormValues.phone,
    whatsappNumber: restaurant?.whatsappNumber ?? emptySettingsFormValues.whatsappNumber,
    email: restaurant?.email ?? emptySettingsFormValues.email,
    address: restaurant?.address ?? emptySettingsFormValues.address,
    mapsUrl: restaurant?.mapsUrl ?? emptySettingsFormValues.mapsUrl,
    workingHours: restaurant?.workingHours ?? emptySettingsFormValues.workingHours,
    primaryColor: restaurant?.primaryColor ?? emptySettingsFormValues.primaryColor,
    secondaryColor: restaurant?.secondaryColor ?? emptySettingsFormValues.secondaryColor,
    accentColor: restaurant?.accentColor ?? emptySettingsFormValues.accentColor,
    successColor: restaurant?.successColor ?? emptySettingsFormValues.successColor,
    currency: settings?.currency ?? emptySettingsFormValues.currency,
    language: settings?.language ?? emptySettingsFormValues.language,
    direction: settings?.direction ?? emptySettingsFormValues.direction,
    orderMode: settings?.orderMode ?? emptySettingsFormValues.orderMode,
    reservationMode: settings?.reservationMode ?? emptySettingsFormValues.reservationMode,
    showHero: settings?.showHero ?? emptySettingsFormValues.showHero,
    showTrustBadges: settings?.showTrustBadges ?? emptySettingsFormValues.showTrustBadges,
    showFeaturedDishes: settings?.showFeaturedDishes ?? emptySettingsFormValues.showFeaturedDishes,
    showOffers: settings?.showOffers ?? emptySettingsFormValues.showOffers,
    showGallery: settings?.showGallery ?? emptySettingsFormValues.showGallery,
    showTestimonials: settings?.showTestimonials ?? emptySettingsFormValues.showTestimonials,
    showActionGrid: settings?.showActionGrid ?? emptySettingsFormValues.showActionGrid,
    showFaq: settings?.showFaq ?? emptySettingsFormValues.showFaq,
    showFooter: settings?.showFooter ?? emptySettingsFormValues.showFooter,
  };
};

const isAcceptableUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isAcceptableEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isHexColor = (value: string) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

const validateSettingsForm = (values: SettingsFormValues): SettingsFormErrors => {
  const errors: SettingsFormErrors = {};

  if (!values.name.trim() && !values.nameAr.trim()) {
    errors.nameAr = "اسم المطعم مطلوب";
  }

  if (!values.whatsappNumber.trim()) {
    errors.whatsappNumber = "رقم واتساب مطلوب";
  }

  if (values.email.trim() && !isAcceptableEmail(values.email.trim())) {
    errors.email = "البريد الإلكتروني غير صالح";
  }

  if (values.mapsUrl.trim() && !isAcceptableUrl(values.mapsUrl.trim())) {
    errors.mapsUrl = "رابط الخريطة يجب أن يكون URL صالحًا";
  }

  if (values.heroImageUrl.trim() && !isAcceptableUrl(values.heroImageUrl.trim())) {
    errors.heroImageUrl = "رابط صورة الواجهة يجب أن يكون URL صالحًا";
  }

  for (const colorKey of ["primaryColor", "secondaryColor", "accentColor", "successColor"] as const) {
    if (values[colorKey].trim() && !isHexColor(values[colorKey].trim())) {
      errors[colorKey] = "اللون يجب أن يكون hex مثل #E51B2B";
    }
  }

  if (!directions.includes(values.direction)) {
    errors.direction = "اتجاه الموقع يجب أن يكون rtl أو ltr";
  }

  if (!orderModes.includes(values.orderMode)) {
    errors.orderMode = "وضع الطلب غير صالح";
  }

  if (!reservationModes.includes(values.reservationMode)) {
    errors.reservationMode = "وضع الحجز غير صالح";
  }

  return errors;
};

const toRestaurantContactInput = (values: SettingsFormValues): RestaurantContactInput => ({
  name: values.name.trim(),
  nameAr: values.nameAr.trim(),
  tagline: values.tagline.trim(),
  description: values.description.trim(),
  logoFileId: values.logoFileId.trim() || undefined,
  heroImageFileId: values.heroImageFileId.trim() || undefined,
  heroImageUrl: values.heroImageUrl.trim() || undefined,
  phone: values.phone.trim(),
  whatsappNumber: values.whatsappNumber.trim(),
  email: values.email.trim() || undefined,
  address: values.address.trim(),
  mapsUrl: values.mapsUrl.trim() || undefined,
  workingHours: values.workingHours.trim(),
  primaryColor: values.primaryColor.trim(),
  secondaryColor: values.secondaryColor.trim(),
  accentColor: values.accentColor.trim(),
  successColor: values.successColor.trim(),
});

const toSiteSettingsInput = (values: SettingsFormValues): SiteSettingsMutationInput => ({
  currency: values.currency.trim() || "د.م",
  language: values.language.trim() || "ar",
  direction: values.direction,
  orderMode: values.orderMode,
  reservationMode: values.reservationMode,
  showHero: values.showHero,
  showTrustBadges: values.showTrustBadges,
  showFeaturedDishes: values.showFeaturedDishes,
  showOffers: values.showOffers,
  showGallery: values.showGallery,
  showTestimonials: values.showTestimonials,
  showActionGrid: values.showActionGrid,
  showFaq: values.showFaq,
  showFooter: values.showFooter,
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof RestaurantRepositoryError || error instanceof SettingsRepositoryError) {
    return error.message;
  }

  return "تعذر حفظ الإعدادات. تحقق من الاتصال أو الصلاحيات.";
};

export default function AdminSettings() {
  const {
    activeRestaurant,
    activeRestaurantId,
    activeRestaurantName,
    canAccessFeature,
    canManageRestaurantContent,
    scopeError,
  } = useActiveRestaurantScope();
  const logAction = useAuditLogger();
  const { refreshProfile } = useAuth();
  const canCustomizeBrand = canAccessFeature("canCustomizeBrand");
  const canUseAdvancedTheme = canAccessFeature("canUseAdvancedTheme");
  const [formValues, setFormValues] = useState<SettingsFormValues>(getSettingsFormValues(activeRestaurant, null));
  const [formErrors, setFormErrors] = useState<SettingsFormErrors>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!activeRestaurantId) {
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const [restaurant, settings] = await Promise.all([getRestaurantById(activeRestaurantId), getSiteSettings(activeRestaurantId)]);
      setFormValues(getSettingsFormValues(restaurant ?? activeRestaurant, settings));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurant, activeRestaurantId]);

  useEffect(() => {
    if (!canManageRestaurantContent || !activeRestaurantId) {
      setFormValues(getSettingsFormValues(activeRestaurant, null));
      return;
    }

    void loadSettings();
  }, [activeRestaurant, activeRestaurantId, canManageRestaurantContent, loadSettings]);

  const updateFormValue = <Key extends keyof SettingsFormValues>(key: Key, value: SettingsFormValues[Key]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageError(null);
    setSuccessMessage(null);

    const nextErrors = validateSettingsForm(formValues);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setIsSaving(true);

    try {
      const [savedRestaurant, savedSettings] = await Promise.all([
        updateRestaurantContact(activeRestaurantId, toRestaurantContactInput(formValues)),
        upsertSiteSettings(activeRestaurantId, toSiteSettingsInput(formValues)),
      ]);

      setFormValues(getSettingsFormValues(savedRestaurant, savedSettings));
      logAction({
        action: "contact_update",
        entityType: "settings",
        entityId: savedRestaurant.id,
        metadata: { name: savedRestaurant.nameAr || savedRestaurant.name },
      });
      logAction({
        action: "settings_update",
        entityType: "settings",
        entityId: savedSettings.id,
        metadata: {
          direction: savedSettings.direction,
          orderMode: savedSettings.orderMode,
          reservationMode: savedSettings.reservationMode,
        },
      });
      setSuccessMessage("تم حفظ الإعدادات بنجاح");
      void refreshProfile();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const renderFieldError = (key: keyof SettingsFormValues) => (formErrors[key] ? <small>{formErrors[key]}</small> : null);

  if (scopeError) {
    return (
      <section className="admin-settings-page">
        <AdminPageHeader
          eyebrow={activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name}
          title="الإعدادات"
          description="أدر بيانات التواصل وإعدادات ظهور الموقع."
        />
        <AdminErrorState title="لا يمكن فتح الإعدادات" message={scopeError} />
      </section>
    );
  }

  return (
    <section className="admin-settings-page">
      <AdminPageHeader
        eyebrow={activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name}
        title="الإعدادات"
        description="أدر بيانات المطعم والتواصل والهوية وإظهار الأقسام من مكان واحد."
        actions={
          canManageRestaurantContent ? (
            <AdminActionButton
              variant="secondary"
              icon={<RefreshCw size={18} aria-hidden="true" />}
              onClick={() => void loadSettings()}
              disabled={isLoading || isSaving}
            >
              تحديث البيانات
            </AdminActionButton>
          ) : null
        }
      />

      {isLoading ? <AdminLoadingState label="جارٍ تحميل الإعدادات..." /> : null}

      {!isLoading ? (
        <form className="admin-settings-form" onSubmit={handleSubmit} noValidate>
          {successMessage ? <div className="admin-feedback admin-feedback--success">{successMessage}</div> : null}
          {pageError ? <div className="admin-feedback admin-feedback--error">{pageError}</div> : null}
          {!canCustomizeBrand ? (
            <div className="admin-feedback admin-feedback--error">
              هذه الميزة غير متاحة في باقتك الحالية. يمكنك تعديل الأساسيات فقط. تواصل مع Pixel One لتفعيل تخصيص الهوية.
            </div>
          ) : null}

          <AdminCard className="admin-settings-section">
            <div className="admin-settings-section__header">
              <Settings size={20} aria-hidden="true" />
              <div>
                <h3>معلومات المطعم</h3>
                <p>الاسم والسطر التعريفي والوصف العام.</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <label>
                <span>اسم المطعم بالعربية</span>
                <input value={formValues.nameAr} onChange={(event) => updateFormValue("nameAr", event.target.value)} aria-invalid={Boolean(formErrors.nameAr)} />
                {renderFieldError("nameAr")}
              </label>
              <label>
                <span>اسم المطعم</span>
                <input value={formValues.name} onChange={(event) => updateFormValue("name", event.target.value)} aria-invalid={Boolean(formErrors.name)} />
                {renderFieldError("name")}
              </label>
              <label className="admin-form-grid__wide">
                <span>السطر التعريفي</span>
                <input value={formValues.tagline} onChange={(event) => updateFormValue("tagline", event.target.value)} />
              </label>
              <label className="admin-form-grid__wide">
                <span>الوصف</span>
                <textarea value={formValues.description} onChange={(event) => updateFormValue("description", event.target.value)} rows={3} />
              </label>
            </div>
          </AdminCard>

          <AdminCard className="admin-settings-section">
            <div className="admin-settings-section__header">
              <Settings size={20} aria-hidden="true" />
              <div>
                <h3>التواصل</h3>
                <p>هذه البيانات تظهر في الموقع العام وروابط واتساب والخرائط.</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <label>
                <span>رقم الهاتف</span>
                <input value={formValues.phone} onChange={(event) => updateFormValue("phone", event.target.value)} inputMode="tel" />
              </label>
              <label>
                <span>رقم واتساب</span>
                <input
                  value={formValues.whatsappNumber}
                  onChange={(event) => updateFormValue("whatsappNumber", event.target.value)}
                  aria-invalid={Boolean(formErrors.whatsappNumber)}
                  inputMode="tel"
                />
                {renderFieldError("whatsappNumber")}
              </label>
              <label>
                <span>البريد الإلكتروني</span>
                <input
                  value={formValues.email}
                  onChange={(event) => updateFormValue("email", event.target.value)}
                  aria-invalid={Boolean(formErrors.email)}
                  inputMode="email"
                />
                {renderFieldError("email")}
              </label>
              <label>
                <span>رابط Google Maps</span>
                <input
                  value={formValues.mapsUrl}
                  onChange={(event) => updateFormValue("mapsUrl", event.target.value)}
                  aria-invalid={Boolean(formErrors.mapsUrl)}
                  inputMode="url"
                />
                {renderFieldError("mapsUrl")}
              </label>
              <label className="admin-form-grid__wide">
                <span>العنوان</span>
                <input value={formValues.address} onChange={(event) => updateFormValue("address", event.target.value)} />
              </label>
              <label className="admin-form-grid__wide">
                <span>أوقات العمل</span>
                <input value={formValues.workingHours} onChange={(event) => updateFormValue("workingHours", event.target.value)} />
              </label>
            </div>
          </AdminCard>

          {canCustomizeBrand ? (
            <>
              <AdminCard className="admin-settings-section">
                <div className="admin-settings-section__header">
                  <Settings size={20} aria-hidden="true" />
                  <div>
                    <h3>الهوية</h3>
                    <p>ألوان الموقع الأساسية بصيغة hex.</p>
                  </div>
                </div>
                <div className="admin-form-grid">
                  {(["primaryColor", "secondaryColor", "accentColor", "successColor"] as const).map((key) => (
                    <label key={key}>
                      <span>
                        {key === "primaryColor"
                          ? "اللون الأساسي"
                          : key === "secondaryColor"
                            ? "اللون الثانوي"
                            : key === "accentColor"
                              ? "لون التمييز"
                              : "لون النجاح"}
                      </span>
                      <span className="admin-color-field">
                        <span style={{ background: formValues[key] }} aria-hidden="true" />
                        <input value={formValues[key]} onChange={(event) => updateFormValue(key, event.target.value)} aria-invalid={Boolean(formErrors[key])} />
                      </span>
                      {renderFieldError(key)}
                    </label>
                  ))}
                </div>
              </AdminCard>

              <AdminCard className="admin-settings-section">
                <div className="admin-settings-section__header">
                  <ImageIcon size={20} aria-hidden="true" />
                  <div>
                    <h3>صور الهوية</h3>
                    <p>الشعار وصورة الواجهة الرئيسية للموقع العام.</p>
                  </div>
                </div>
                <div className="admin-form-grid">
                  <div className="admin-form-grid__wide">
                    <span className="admin-field-label">شعار المطعم</span>
                    <AdminImageUploader
                      restaurantId={activeRestaurantId ?? ""}
                      type="logo"
                      value={{
                        imageFileId: formValues.logoFileId || undefined,
                        imageUrl: formValues.logoPreviewUrl || undefined,
                      }}
                      onChange={(nextValue) => {
                        updateFormValue("logoFileId", nextValue.imageFileId ?? "");
                        updateFormValue("logoPreviewUrl", nextValue.imageUrl ?? "");
                      }}
                      disabled={isSaving || !activeRestaurantId}
                    />
                  </div>

                  <label>
                    <span>رابط صورة الواجهة اليدوي</span>
                    <input
                      value={formValues.heroImageUrl}
                      onChange={(event) => updateFormValue("heroImageUrl", event.target.value)}
                      aria-invalid={Boolean(formErrors.heroImageUrl)}
                      inputMode="url"
                      placeholder="https://example.com/hero.jpg"
                    />
                    {renderFieldError("heroImageUrl")}
                  </label>

                  <div className="admin-form-grid__wide">
                    <span className="admin-field-label">صورة الواجهة الرئيسية</span>
                    <AdminImageUploader
                      restaurantId={activeRestaurantId ?? ""}
                      type="hero"
                      value={{
                        imageFileId: formValues.heroImageFileId || undefined,
                        imageUrl: formValues.heroImageUrl || formValues.heroPreviewUrl || undefined,
                      }}
                      onChange={(nextValue) => {
                        updateFormValue("heroImageFileId", nextValue.imageFileId ?? "");
                        updateFormValue("heroImageUrl", nextValue.imageUrl ?? "");
                        updateFormValue("heroPreviewUrl", nextValue.imageUrl ?? "");
                      }}
                      disabled={isSaving || !activeRestaurantId}
                    />
                  </div>
                </div>
              </AdminCard>
            </>
          ) : null}

          <AdminCard className="admin-settings-section">
            <div className="admin-settings-section__header">
              <Settings size={20} aria-hidden="true" />
              <div>
                <h3>إعدادات الموقع</h3>
                <p>العملة واللغة واتجاه الواجهة وأنماط الطلب والحجز.</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <label>
                <span>العملة</span>
                <input value={formValues.currency} onChange={(event) => updateFormValue("currency", event.target.value)} placeholder="د.م" />
              </label>
              <label>
                <span>اللغة</span>
                <input value={formValues.language} onChange={(event) => updateFormValue("language", event.target.value)} placeholder="ar" />
              </label>
              <label>
                <span>اتجاه الموقع</span>
                <select value={formValues.direction} onChange={(event) => updateFormValue("direction", event.target.value as SiteDirection)} aria-invalid={Boolean(formErrors.direction)}>
                  {directions.map((direction) => (
                    <option value={direction} key={direction}>
                      {direction}
                    </option>
                  ))}
                </select>
                {renderFieldError("direction")}
              </label>
              <label>
                <span>وضع الطلب</span>
                <select value={formValues.orderMode} onChange={(event) => updateFormValue("orderMode", event.target.value as OrderMode)} aria-invalid={Boolean(formErrors.orderMode)}>
                  {orderModes.map((mode) => (
                    <option value={mode} key={mode}>
                      {modeLabels[mode]}
                    </option>
                  ))}
                </select>
                {renderFieldError("orderMode")}
              </label>
              <label>
                <span>وضع الحجز</span>
                <select
                  value={formValues.reservationMode}
                  onChange={(event) => updateFormValue("reservationMode", event.target.value as ReservationMode)}
                  aria-invalid={Boolean(formErrors.reservationMode)}
                >
                  {reservationModes.map((mode) => (
                    <option value={mode} key={mode}>
                      {modeLabels[mode]}
                    </option>
                  ))}
                </select>
                {renderFieldError("reservationMode")}
              </label>
            </div>
          </AdminCard>

          {canUseAdvancedTheme ? (
          <AdminCard className="admin-settings-section">
            <div className="admin-settings-section__header">
              <Settings size={20} aria-hidden="true" />
              <div>
                <h3>إظهار وإخفاء الأقسام</h3>
                <p>تحكم في الأقسام التي تظهر في الموقع العام.</p>
              </div>
            </div>
            <div className="admin-toggle-grid">
              {sectionToggles.map((item) => (
                <label className="admin-toggle-row" key={item.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(formValues[item.key])}
                    onChange={(event) => updateFormValue(item.key, event.target.checked)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </AdminCard>
          ) : null}

          <div className="admin-settings-form__actions">
            <AdminActionButton variant="primary" type="submit" icon={<Save size={18} aria-hidden="true" />} disabled={isSaving}>
              {isSaving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </AdminActionButton>
          </div>
        </form>
      ) : null}
    </section>
  );
}
