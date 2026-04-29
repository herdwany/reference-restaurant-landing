import { ImageIcon, Pencil, Plus, Power, PowerOff, RefreshCw, Tag, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminActionButton from "../components/AdminActionButton";
import AdminCard from "../components/AdminCard";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import AdminEmptyState from "../components/AdminEmptyState";
import AdminErrorState from "../components/AdminErrorState";
import AdminFeatureUnavailable from "../components/AdminFeatureUnavailable";
import AdminFormModal from "../components/AdminFormModal";
import AdminImageUploader from "../components/AdminImageUploader";
import AdminLoadingState from "../components/AdminLoadingState";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminStatusBadge from "../components/AdminStatusBadge";
import { useActiveRestaurantScope } from "../hooks/useActiveRestaurantScope";
import { useAuditLogger } from "../hooks/useAuditLogger";
import { mapKnownErrorToFriendlyMessage } from "../../lib/friendlyErrors";
import { useI18n } from "../../lib/i18n/I18nContext";
import { parseTranslationString, stringifyTranslations } from "../../lib/i18n/localizedContent";
import {
  createOffer,
  deleteOffer,
  getOffersByRestaurant,
  toggleOfferActive,
  updateOffer,
  type OfferMutationInput,
} from "../../services/repositories/offersRepository";
import type { ColorTheme, Offer } from "../../types/platform";

type OfferFormValues = {
  colorTheme: ColorTheme;
  ctaText: string;
  description: string;
  endsAt: string;
  imageFileId: string;
  imageUrl: string;
  isActive: boolean;
  oldPrice: string;
  price: string;
  sortOrder: string;
  startsAt: string;
  title: string;
  frTitle: string;
  frDescription: string;
  frCtaText: string;
  enTitle: string;
  enDescription: string;
  enCtaText: string;
};

type OfferFormErrors = Partial<Record<keyof OfferFormValues, string>>;
type OfferFormMode = { type: "create" } | { type: "edit"; offer: Offer };

const colorThemes = ["orange", "red", "gold"] as const satisfies readonly ColorTheme[];
type Translate = ReturnType<typeof useI18n>["t"];

const getOfferThemeLabels = (t: Translate): Record<ColorTheme, string> => ({
  orange: t("offerThemeOrange"),
  red: t("offerThemeRed"),
  gold: t("offerThemeGold"),
});

const getEmptyOfferFormValues = (t: Translate): OfferFormValues => ({
  colorTheme: "red",
  ctaText: t("orderNow"),
  description: "",
  endsAt: "",
  imageFileId: "",
  imageUrl: "",
  isActive: true,
  oldPrice: "",
  price: "",
  sortOrder: "",
  startsAt: "",
  title: "",
  frTitle: "",
  frDescription: "",
  frCtaText: "",
  enTitle: "",
  enDescription: "",
  enCtaText: "",
});

const formatPrice = (value: number, currency: string, locale: string) =>
  `${new Intl.NumberFormat(locale).format(value)} ${currency}`;
const formatOptionalNumber = (value: number | undefined) => (typeof value === "number" ? String(value) : "");
const parseOptionalNumber = (value: string) => (value.trim() ? Number(value) : undefined);
const isKnownColorTheme = (value: string): value is ColorTheme => colorThemes.includes(value as ColorTheme);

const toLocalInputValue = (value: string | undefined) => {
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

const getOfferFormValues = (offer: Offer | undefined, t: Translate): OfferFormValues => {
  if (!offer) {
    return getEmptyOfferFormValues(t);
  }

  const translations = parseTranslationString(offer.translations);

  return {
    colorTheme: offer.colorTheme,
    ctaText: offer.ctaText || t("orderNow"),
    description: offer.description,
    endsAt: toLocalInputValue(offer.endsAt),
    imageFileId: offer.imageFileId ?? "",
    imageUrl: offer.imageUrl ?? "",
    isActive: offer.isActive,
    oldPrice: formatOptionalNumber(offer.oldPrice),
    price: String(offer.price),
    sortOrder: formatOptionalNumber(offer.sortOrder),
    startsAt: toLocalInputValue(offer.startsAt),
    title: offer.title,
    frTitle: String(translations.fr?.title ?? ""),
    frDescription: String(translations.fr?.description ?? ""),
    frCtaText: String(translations.fr?.ctaText ?? ""),
    enTitle: String(translations.en?.title ?? ""),
    enDescription: String(translations.en?.description ?? ""),
    enCtaText: String(translations.en?.ctaText ?? ""),
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

const validateOfferForm = (values: OfferFormValues, t: Translate): OfferFormErrors => {
  const errors: OfferFormErrors = {};
  const price = Number(values.price);
  const oldPrice = parseOptionalNumber(values.oldPrice);
  const sortOrder = parseOptionalNumber(values.sortOrder);
  const startsAt = values.startsAt ? Date.parse(values.startsAt) : null;
  const endsAt = values.endsAt ? Date.parse(values.endsAt) : null;

  if (!values.title.trim()) {
    errors.title = t("requiredField");
  }

  if (!values.price.trim()) {
    errors.price = t("requiredField");
  } else if (!Number.isFinite(price) || price <= 0) {
    errors.price = t("invalidValue");
  }

  if (oldPrice !== undefined && (!Number.isFinite(oldPrice) || oldPrice <= 0)) {
    errors.oldPrice = t("invalidValue");
  }

  if (values.imageUrl.trim() && !isAcceptableUrl(values.imageUrl.trim())) {
    errors.imageUrl = t("invalidValue");
  }

  if (!isKnownColorTheme(values.colorTheme)) {
    errors.colorTheme = t("invalidValue");
  }

  if (sortOrder !== undefined && !Number.isFinite(sortOrder)) {
    errors.sortOrder = t("invalidValue");
  }

  if (startsAt !== null && Number.isNaN(startsAt)) {
    errors.startsAt = t("invalidValue");
  }

  if (endsAt !== null && Number.isNaN(endsAt)) {
    errors.endsAt = t("invalidValue");
  }

  if (startsAt !== null && endsAt !== null && Number.isFinite(startsAt) && Number.isFinite(endsAt) && endsAt < startsAt) {
    errors.endsAt = t("invalidValue");
  }

  return errors;
};

const toOfferMutationInput = (values: OfferFormValues, canSaveTranslations: boolean, t: Translate): OfferMutationInput => ({
  colorTheme: values.colorTheme,
  ctaText: values.ctaText.trim() || t("orderNow"),
  description: values.description.trim(),
  translations: canSaveTranslations
    ? stringifyTranslations({
      fr: {
        title: values.frTitle,
        description: values.frDescription,
        ctaText: values.frCtaText,
      },
      en: {
        title: values.enTitle,
        description: values.enDescription,
        ctaText: values.enCtaText,
      },
    })
    : undefined,
  endsAt: values.endsAt || undefined,
  imageFileId: values.imageFileId.trim() || undefined,
  imageUrl: values.imageUrl.trim() || undefined,
  isActive: values.isActive,
  oldPrice: parseOptionalNumber(values.oldPrice),
  price: Number(values.price),
  sortOrder: parseOptionalNumber(values.sortOrder),
  startsAt: values.startsAt || undefined,
  title: values.title.trim(),
});

const sortOffers = (offers: Offer[]) =>
  [...offers].sort((first, second) => {
    const orderDiff = (first.sortOrder ?? Number.MAX_SAFE_INTEGER) - (second.sortOrder ?? Number.MAX_SAFE_INTEGER);
    return orderDiff || first.title.localeCompare(second.title, "ar");
  });

const getErrorMessage = (error: unknown, t: Translate) => mapKnownErrorToFriendlyMessage(error, t);

export default function AdminOffers() {
  const { currentLanguage, t } = useI18n();
  const translationLanguageLabels = {
    fr: t("languageFrench"),
    en: t("languageEnglish"),
  };
  const {
    activeRestaurant,
    activeRestaurantId,
    activeRestaurantName,
    canAccessFeature,
    canManageRestaurantContent,
    scopeError,
  } = useActiveRestaurantScope();
  const logAction = useAuditLogger();
  const canUseOffers = canAccessFeature("canManageOffers");
  const canSaveTranslations = canAccessFeature("canCustomizeBrand");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [formMode, setFormMode] = useState<OfferFormMode | null>(null);
  const [formValues, setFormValues] = useState<OfferFormValues>(() => getEmptyOfferFormValues(t));
  const [formErrors, setFormErrors] = useState<OfferFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [pendingDeleteOffer, setPendingDeleteOffer] = useState<Offer | null>(null);
  const activeCount = useMemo(() => offers.filter((offer) => offer.isActive).length, [offers]);
  const currencyLabel = t("adminCurrency");
  const featureUnavailableMessage = `${t("featureUnavailable")} ${t("contactSupport")}`;
  const colorThemeLabels = getOfferThemeLabels(t);

  const loadOffers = useCallback(async () => {
    if (!canUseOffers || !activeRestaurantId) {
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const loadedOffers = await getOffersByRestaurant(activeRestaurantId);
      setOffers(sortOffers(loadedOffers));
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId, canUseOffers, t]);

  useEffect(() => {
    if (!canManageRestaurantContent || !canUseOffers || !activeRestaurantId) {
      setOffers([]);
      return;
    }

    void loadOffers();
  }, [activeRestaurantId, canManageRestaurantContent, canUseOffers, loadOffers]);

  const openCreateModal = () => {
    if (!canUseOffers) {
      setPageError(featureUnavailableMessage);
      return;
    }

    setFormMode({ type: "create" });
    setFormValues(getEmptyOfferFormValues(t));
    setFormErrors({});
    setFormError(null);
  };

  const openEditModal = (offer: Offer) => {
    if (!canUseOffers) {
      setPageError(featureUnavailableMessage);
      return;
    }

    setFormMode({ type: "edit", offer });
    setFormValues(getOfferFormValues(offer, t));
    setFormErrors({});
    setFormError(null);
  };

  const closeFormModal = () => {
    if (isSaving) {
      return;
    }

    setFormMode(null);
    setFormErrors({});
    setFormError(null);
  };

  const updateFormValue = <Key extends keyof OfferFormValues>(key: Key, value: OfferFormValues[Key]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const nextErrors = validateOfferForm(formValues, t);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !formMode) {
      return;
    }

    if (!canUseOffers) {
      setFormError(featureUnavailableMessage);
      return;
    }

    if (!activeRestaurantId) {
      setFormError(t("restaurantScopeMissing"));
      return;
    }

    setIsSaving(true);

    try {
      const input = toOfferMutationInput(formValues, canSaveTranslations, t);
      if (!canSaveTranslations && formMode.type === "edit") {
        input.translations = formMode.offer.translations;
      }
      const savedOffer =
        formMode.type === "edit"
          ? await updateOffer(formMode.offer.id, input, activeRestaurantId)
          : await createOffer(activeRestaurantId, input);

      setOffers((current) => {
        const nextOffers =
          formMode.type === "edit"
            ? current.map((offer) => (offer.id === savedOffer.id ? savedOffer : offer))
            : [savedOffer, ...current];

        return sortOffers(nextOffers);
      });

      logAction({
        action: formMode.type === "edit" ? "update" : "create",
        entityType: "offer",
        entityId: savedOffer.id,
        metadata: {
          name: savedOffer.title,
          isActive: savedOffer.isActive,
        },
      });
      setSuccessMessage(formMode.type === "edit" ? t("offerUpdated") : t("offerSaved"));
      setFormMode(null);
    } catch (error) {
      setFormError(getErrorMessage(error, t));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    if (!canUseOffers) {
      setPageError(featureUnavailableMessage);
      return;
    }

    if (!activeRestaurantId) {
      setPageError(t("restaurantScopeMissing"));
      return;
    }

    setBusyOfferId(offer.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const updatedOffer = await toggleOfferActive(offer.id, !offer.isActive, activeRestaurantId);
      setOffers((current) => sortOffers(current.map((item) => (item.id === updatedOffer.id ? updatedOffer : item))));
      logAction({
        action: updatedOffer.isActive ? "activate" : "deactivate",
        entityType: "offer",
        entityId: updatedOffer.id,
        metadata: { name: updatedOffer.title },
      });
      setSuccessMessage(updatedOffer.isActive ? t("offerActive") : t("offerInactive"));
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setBusyOfferId(null);
    }
  };

  const handleDeleteOffer = async () => {
    if (!pendingDeleteOffer) {
      return;
    }

    if (!canUseOffers) {
      setPageError(featureUnavailableMessage);
      return;
    }

    if (!activeRestaurantId) {
      setPageError(t("restaurantScopeMissing"));
      return;
    }

    setBusyOfferId(pendingDeleteOffer.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      await deleteOffer(pendingDeleteOffer.id, activeRestaurantId);
      setOffers((current) => current.filter((offer) => offer.id !== pendingDeleteOffer.id));
      logAction({
        action: "delete",
        entityType: "offer",
        entityId: pendingDeleteOffer.id,
        metadata: { name: pendingDeleteOffer.title },
      });
      setSuccessMessage(t("offerDeleted"));
      setPendingDeleteOffer(null);
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setBusyOfferId(null);
    }
  };

  const renderContent = () => {
    if (scopeError) {
      return <AdminErrorState title={t("offersTitle")} message={scopeError} />;
    }

    if (!canUseOffers) {
      return <AdminFeatureUnavailable featureName={t("offers")} />;
    }

    if (isLoading) {
      return <AdminLoadingState label={t("loading")} />;
    }

    if (pageError) {
      return (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadOffers()}>
              {t("retry")}
            </AdminActionButton>
          }
        />
      );
    }

    if (offers.length === 0) {
      return (
        <AdminEmptyState
          icon={<Tag size={30} aria-hidden="true" />}
          title={t("offersEmptyTitle")}
          body={t("offersEmptyBody")}
          action={
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              {t("addOffer")}
            </AdminActionButton>
          }
        />
      );
    }

    return (
      <div className="admin-dishes-grid">
        {offers.map((offer) => (
          <AdminCard as="article" className={`admin-dish-card admin-offer-card admin-offer-card--${offer.colorTheme}`} key={offer.id}>
            <div className="admin-dish-card__image">
              {offer.imageUrl ? (
                <img src={offer.imageUrl} alt={offer.title} loading="lazy" />
              ) : (
                <div className="admin-dish-card__placeholder">
                  <ImageIcon size={34} aria-hidden="true" />
                </div>
              )}
              <span>{colorThemeLabels[offer.colorTheme]}</span>
            </div>

            <div className="admin-dish-card__body">
              <div className="admin-dish-card__heading">
                <div>
                  <h3>{offer.title}</h3>
                  <p>{offer.ctaText}</p>
                </div>
                <AdminStatusBadge tone={offer.isActive ? "success" : "warning"}>
                  {offer.isActive ? t("offerActive") : t("offerInactive")}
                </AdminStatusBadge>
              </div>

              {offer.description ? <p className="admin-dish-card__description">{offer.description}</p> : null}

              <div className="admin-dish-card__meta">
                <div>
                  <strong>{formatPrice(offer.price, currencyLabel, currentLanguage)}</strong>
                  {offer.oldPrice ? <del>{formatPrice(offer.oldPrice, currencyLabel, currentLanguage)}</del> : null}
                </div>
              </div>

              <div className="admin-dish-card__flags">
                <span>
                  {t("offerTheme")}: {colorThemeLabels[offer.colorTheme]}
                </span>
                {typeof offer.sortOrder === "number" ? (
                  <span>
                    {t("sortOrder")}: {offer.sortOrder}
                  </span>
                ) : null}
              </div>

              <div className="admin-dish-card__actions">
                <AdminActionButton variant="secondary" icon={<Pencil size={17} aria-hidden="true" />} onClick={() => openEditModal(offer)}>
                  {t("edit")}
                </AdminActionButton>
                <AdminActionButton
                  variant="primary"
                  icon={offer.isActive ? <PowerOff size={17} aria-hidden="true" /> : <Power size={17} aria-hidden="true" />}
                  onClick={() => void handleToggleActive(offer)}
                  disabled={busyOfferId === offer.id}
                >
                  {offer.isActive ? t("deactivateOffer") : t("activateOffer")}
                </AdminActionButton>
                <AdminActionButton
                  variant="ghost"
                  icon={<Trash2 size={17} aria-hidden="true" />}
                  onClick={() => setPendingDeleteOffer(offer)}
                  disabled={busyOfferId === offer.id}
                >
                  {t("delete")}
                </AdminActionButton>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>
    );
  };

  return (
    <section className="admin-dishes-page">
      <AdminPageHeader
        eyebrow={activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name}
        title={t("offersTitle")}
        description={t("featureOffersDescription")}
        actions={
          canManageRestaurantContent && canUseOffers ? (
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              {t("addOffer")}
            </AdminActionButton>
          ) : null
        }
      />

      {canManageRestaurantContent && canUseOffers && offers.length > 0 ? (
        <div className="admin-dishes-summary" aria-label={`${t("summary")} - ${t("offers")}`}>
          <span>
            {t("offers")}: {offers.length}
          </span>
          <span>
            {t("offerActive")}: {activeCount}
          </span>
          <span>
            {t("offerInactive")}: {offers.length - activeCount}
          </span>
        </div>
      ) : null}

      {successMessage ? <div className="admin-feedback admin-feedback--success">{successMessage}</div> : null}

      {renderContent()}

      <AdminFormModal
        isOpen={Boolean(formMode)}
        title={formMode?.type === "edit" ? t("editOffer") : t("addOffer")}
        description={t("offerFormDescription")}
        onClose={closeFormModal}
        size="lg"
      >
        <form className="admin-dish-form" onSubmit={handleSubmit} noValidate>
          {formError ? <div className="admin-feedback admin-feedback--error">{formError}</div> : null}

          <div className="admin-form-grid">
            <label>
              <span>{t("offerTitle")}</span>
              <input
                value={formValues.title}
                onChange={(event) => updateFormValue("title", event.target.value)}
                aria-invalid={Boolean(formErrors.title)}
              />
              {formErrors.title ? <small>{formErrors.title}</small> : null}
            </label>

            <label>
              <span>{t("offerTheme")}</span>
              <select
                value={formValues.colorTheme}
                onChange={(event) => updateFormValue("colorTheme", event.target.value as ColorTheme)}
                aria-invalid={Boolean(formErrors.colorTheme)}
              >
                {colorThemes.map((theme) => (
                  <option value={theme} key={theme}>
                    {colorThemeLabels[theme]}
                  </option>
                ))}
              </select>
              {formErrors.colorTheme ? <small>{formErrors.colorTheme}</small> : null}
            </label>

            <label>
              <span>{t("offerPrice")}</span>
              <input
                value={formValues.price}
                onChange={(event) => updateFormValue("price", event.target.value)}
                aria-invalid={Boolean(formErrors.price)}
                inputMode="decimal"
              />
              {formErrors.price ? <small>{formErrors.price}</small> : null}
            </label>

            <label>
              <span>{t("oldPrice")}</span>
              <input
                value={formValues.oldPrice}
                onChange={(event) => updateFormValue("oldPrice", event.target.value)}
                aria-invalid={Boolean(formErrors.oldPrice)}
                inputMode="decimal"
              />
              {formErrors.oldPrice ? <small>{formErrors.oldPrice}</small> : null}
            </label>

            <label>
              <span>{t("imageUrl")}</span>
              <input
                value={formValues.imageUrl}
                onChange={(event) => updateFormValue("imageUrl", event.target.value)}
                aria-invalid={Boolean(formErrors.imageUrl)}
                inputMode="url"
                placeholder="https://example.com/offer.jpg"
              />
              {formErrors.imageUrl ? <small>{formErrors.imageUrl}</small> : null}
            </label>

            <div className="admin-form-grid__wide">
              <span className="admin-field-label">{t("imageUpload")}</span>
              <AdminImageUploader
                restaurantId={activeRestaurantId ?? ""}
                type="offer"
                value={{
                  imageFileId: formValues.imageFileId || undefined,
                  imageUrl: formValues.imageUrl || undefined,
                }}
                onChange={(nextValue) => {
                  updateFormValue("imageFileId", nextValue.imageFileId ?? "");
                  updateFormValue("imageUrl", nextValue.imageUrl ?? "");
                }}
                disabled={isSaving || !activeRestaurantId}
              />
            </div>

            <label>
              <span>{t("offerCtaText")}</span>
              <input value={formValues.ctaText} onChange={(event) => updateFormValue("ctaText", event.target.value)} />
            </label>

            <label>
              <span>{t("startDate")}</span>
              <input
                type="datetime-local"
                value={formValues.startsAt}
                onChange={(event) => updateFormValue("startsAt", event.target.value)}
                aria-invalid={Boolean(formErrors.startsAt)}
              />
              {formErrors.startsAt ? <small>{formErrors.startsAt}</small> : null}
            </label>

            <label>
              <span>{t("endDate")}</span>
              <input
                type="datetime-local"
                value={formValues.endsAt}
                onChange={(event) => updateFormValue("endsAt", event.target.value)}
                aria-invalid={Boolean(formErrors.endsAt)}
              />
              {formErrors.endsAt ? <small>{formErrors.endsAt}</small> : null}
            </label>

            <label>
              <span>{t("sortOrder")}</span>
              <input
                value={formValues.sortOrder}
                onChange={(event) => updateFormValue("sortOrder", event.target.value)}
                aria-invalid={Boolean(formErrors.sortOrder)}
                inputMode="numeric"
              />
              {formErrors.sortOrder ? <small>{formErrors.sortOrder}</small> : null}
            </label>

            <label className="admin-form-grid__wide">
              <span>{t("offerDescription")}</span>
              <textarea value={formValues.description} onChange={(event) => updateFormValue("description", event.target.value)} rows={3} />
            </label>

            {canSaveTranslations ? (
              <details className="admin-form-grid__wide admin-translation-panel">
                <summary>{t("offerTranslations")}</summary>
                <div className="admin-form-grid">
                  <label>
                    <span>
                      {t("offerTitle")} ({translationLanguageLabels.fr})
                    </span>
                    <input value={formValues.frTitle} onChange={(event) => updateFormValue("frTitle", event.target.value)} />
                  </label>
                  <label>
                    <span>
                      {t("offerTitle")} ({translationLanguageLabels.en})
                    </span>
                    <input value={formValues.enTitle} onChange={(event) => updateFormValue("enTitle", event.target.value)} />
                  </label>
                  <label>
                    <span>
                      {t("offerCtaText")} ({translationLanguageLabels.fr})
                    </span>
                    <input value={formValues.frCtaText} onChange={(event) => updateFormValue("frCtaText", event.target.value)} />
                  </label>
                  <label>
                    <span>
                      {t("offerCtaText")} ({translationLanguageLabels.en})
                    </span>
                    <input value={formValues.enCtaText} onChange={(event) => updateFormValue("enCtaText", event.target.value)} />
                  </label>
                  <label className="admin-form-grid__wide">
                    <span>
                      {t("offerDescription")} ({translationLanguageLabels.fr})
                    </span>
                    <textarea value={formValues.frDescription} onChange={(event) => updateFormValue("frDescription", event.target.value)} rows={2} />
                  </label>
                  <label className="admin-form-grid__wide">
                    <span>
                      {t("offerDescription")} ({translationLanguageLabels.en})
                    </span>
                    <textarea value={formValues.enDescription} onChange={(event) => updateFormValue("enDescription", event.target.value)} rows={2} />
                  </label>
                </div>
              </details>
            ) : null}
          </div>

          <div className="admin-dish-form__checks">
            <label>
              <input type="checkbox" checked={formValues.isActive} onChange={(event) => updateFormValue("isActive", event.target.checked)} />
              <span>{t("offerActive")}</span>
            </label>
          </div>

          <div className="admin-dish-form__actions">
            <AdminActionButton variant="ghost" onClick={closeFormModal} disabled={isSaving}>
              {t("cancel")}
            </AdminActionButton>
            <AdminActionButton variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? t("saving") : t("save")}
            </AdminActionButton>
          </div>
        </form>
      </AdminFormModal>

      <AdminConfirmDialog
        isOpen={Boolean(pendingDeleteOffer)}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage")}
        confirmLabel={t("confirmDeleteLabel")}
        isDanger
        isSubmitting={Boolean(pendingDeleteOffer && busyOfferId === pendingDeleteOffer.id)}
        onCancel={() => setPendingDeleteOffer(null)}
        onConfirm={() => void handleDeleteOffer()}
      />
    </section>
  );
}
