import { ImageIcon, Pencil, Plus, Power, PowerOff, RefreshCw, Tag, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminActionButton from "../components/AdminActionButton";
import AdminCard from "../components/AdminCard";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import AdminEmptyState from "../components/AdminEmptyState";
import AdminErrorState from "../components/AdminErrorState";
import AdminFormModal from "../components/AdminFormModal";
import AdminImageUploader from "../components/AdminImageUploader";
import AdminLoadingState from "../components/AdminLoadingState";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminStatusBadge from "../components/AdminStatusBadge";
import { useActiveRestaurantScope } from "../hooks/useActiveRestaurantScope";
import { useAuditLogger } from "../hooks/useAuditLogger";
import {
  OffersRepositoryError,
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
};

type OfferFormErrors = Partial<Record<keyof OfferFormValues, string>>;
type OfferFormMode = { type: "create" } | { type: "edit"; offer: Offer };

const adminCurrency = "ر.س";
const colorThemes = ["orange", "red", "gold"] as const satisfies readonly ColorTheme[];
const colorThemeLabels: Record<ColorTheme, string> = {
  orange: "برتقالي",
  red: "أحمر",
  gold: "ذهبي",
};

const emptyOfferFormValues: OfferFormValues = {
  colorTheme: "red",
  ctaText: "اطلب الآن",
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
};

const formatPrice = (value: number) => `${new Intl.NumberFormat("ar-SA").format(value)} ${adminCurrency}`;
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

const getOfferFormValues = (offer?: Offer): OfferFormValues => {
  if (!offer) {
    return emptyOfferFormValues;
  }

  return {
    colorTheme: offer.colorTheme,
    ctaText: offer.ctaText || "اطلب الآن",
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

const validateOfferForm = (values: OfferFormValues): OfferFormErrors => {
  const errors: OfferFormErrors = {};
  const price = Number(values.price);
  const oldPrice = parseOptionalNumber(values.oldPrice);
  const sortOrder = parseOptionalNumber(values.sortOrder);
  const startsAt = values.startsAt ? Date.parse(values.startsAt) : null;
  const endsAt = values.endsAt ? Date.parse(values.endsAt) : null;

  if (!values.title.trim()) {
    errors.title = "عنوان العرض مطلوب";
  }

  if (!values.price.trim()) {
    errors.price = "السعر مطلوب";
  } else if (!Number.isFinite(price) || price <= 0) {
    errors.price = "السعر يجب أن يكون رقمًا أكبر من 0";
  }

  if (oldPrice !== undefined && (!Number.isFinite(oldPrice) || oldPrice <= 0)) {
    errors.oldPrice = "السعر القديم يجب أن يكون رقمًا صحيحًا إذا تم إدخاله";
  }

  if (values.imageUrl.trim() && !isAcceptableUrl(values.imageUrl.trim())) {
    errors.imageUrl = "رابط الصورة غير صحيح";
  }

  if (!isKnownColorTheme(values.colorTheme)) {
    errors.colorTheme = "لون العرض يجب أن يكون orange أو red أو gold";
  }

  if (sortOrder !== undefined && !Number.isFinite(sortOrder)) {
    errors.sortOrder = "ترتيب الظهور يجب أن يكون رقمًا";
  }

  if (startsAt !== null && Number.isNaN(startsAt)) {
    errors.startsAt = "تاريخ البداية غير صحيح";
  }

  if (endsAt !== null && Number.isNaN(endsAt)) {
    errors.endsAt = "تاريخ النهاية غير صحيح";
  }

  if (startsAt !== null && endsAt !== null && Number.isFinite(startsAt) && Number.isFinite(endsAt) && endsAt < startsAt) {
    errors.endsAt = "تاريخ النهاية لا يجب أن يكون قبل تاريخ البداية";
  }

  return errors;
};

const toOfferMutationInput = (values: OfferFormValues): OfferMutationInput => ({
  colorTheme: values.colorTheme,
  ctaText: values.ctaText.trim() || "اطلب الآن",
  description: values.description.trim(),
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

const getErrorMessage = (error: unknown) => {
  if (error instanceof OffersRepositoryError) {
    return error.message;
  }

  return "تعذر تنفيذ العملية. تحقق من الاتصال أو الصلاحيات.";
};

export default function AdminOffers() {
  const { activeRestaurant, activeRestaurantId, canManageRestaurantContent, scopeError } = useActiveRestaurantScope();
  const logAction = useAuditLogger();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [formMode, setFormMode] = useState<OfferFormMode | null>(null);
  const [formValues, setFormValues] = useState<OfferFormValues>(emptyOfferFormValues);
  const [formErrors, setFormErrors] = useState<OfferFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [pendingDeleteOffer, setPendingDeleteOffer] = useState<Offer | null>(null);
  const activeCount = useMemo(() => offers.filter((offer) => offer.isActive).length, [offers]);

  const loadOffers = useCallback(async () => {
    if (!activeRestaurantId) {
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const loadedOffers = await getOffersByRestaurant(activeRestaurantId);
      setOffers(sortOffers(loadedOffers));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId]);

  useEffect(() => {
    if (!canManageRestaurantContent || !activeRestaurantId) {
      setOffers([]);
      return;
    }

    void loadOffers();
  }, [activeRestaurantId, canManageRestaurantContent, loadOffers]);

  const openCreateModal = () => {
    setFormMode({ type: "create" });
    setFormValues(emptyOfferFormValues);
    setFormErrors({});
    setFormError(null);
  };

  const openEditModal = (offer: Offer) => {
    setFormMode({ type: "edit", offer });
    setFormValues(getOfferFormValues(offer));
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

    const nextErrors = validateOfferForm(formValues);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !formMode) {
      return;
    }

    if (!activeRestaurantId) {
      setFormError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setIsSaving(true);

    try {
      const input = toOfferMutationInput(formValues);
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
      setSuccessMessage("تم حفظ العرض بنجاح");
      setFormMode(null);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
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
      setSuccessMessage(updatedOffer.isActive ? "تم تفعيل العرض" : "تم إيقاف العرض");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyOfferId(null);
    }
  };

  const handleDeleteOffer = async () => {
    if (!pendingDeleteOffer) {
      return;
    }

    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
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
      setSuccessMessage("تم حذف العرض نهائيًا");
      setPendingDeleteOffer(null);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyOfferId(null);
    }
  };

  const renderContent = () => {
    if (scopeError) {
      return <AdminErrorState title="لا يمكن فتح إدارة العروض" message={scopeError} />;
    }

    if (isLoading) {
      return <AdminLoadingState label="جارٍ تحميل العروض..." />;
    }

    if (pageError) {
      return (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadOffers()}>
              إعادة المحاولة
            </AdminActionButton>
          }
        />
      );
    }

    if (offers.length === 0) {
      return (
        <AdminEmptyState
          icon={<Tag size={30} aria-hidden="true" />}
          title="لا توجد عروض بعد"
          body="ابدأ بإضافة أول عرض ليظهر هنا داخل لوحة التحكم."
          action={
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              إضافة عرض
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
                <AdminStatusBadge tone={offer.isActive ? "success" : "warning"}>{offer.isActive ? "نشط" : "متوقف"}</AdminStatusBadge>
              </div>

              {offer.description ? <p className="admin-dish-card__description">{offer.description}</p> : null}

              <div className="admin-dish-card__meta">
                <div>
                  <strong>{formatPrice(offer.price)}</strong>
                  {offer.oldPrice ? <del>{formatPrice(offer.oldPrice)}</del> : null}
                </div>
              </div>

              <div className="admin-dish-card__flags">
                <span>لون العرض: {colorThemeLabels[offer.colorTheme]}</span>
                {typeof offer.sortOrder === "number" ? <span>ترتيب {offer.sortOrder}</span> : null}
              </div>

              <div className="admin-dish-card__actions">
                <AdminActionButton variant="secondary" icon={<Pencil size={17} aria-hidden="true" />} onClick={() => openEditModal(offer)}>
                  تعديل
                </AdminActionButton>
                <AdminActionButton
                  variant="primary"
                  icon={offer.isActive ? <PowerOff size={17} aria-hidden="true" /> : <Power size={17} aria-hidden="true" />}
                  onClick={() => void handleToggleActive(offer)}
                  disabled={busyOfferId === offer.id}
                >
                  {offer.isActive ? "إيقاف العرض" : "تفعيل العرض"}
                </AdminActionButton>
                <AdminActionButton
                  variant="ghost"
                  icon={<Trash2 size={17} aria-hidden="true" />}
                  onClick={() => setPendingDeleteOffer(offer)}
                  disabled={busyOfferId === offer.id}
                >
                  حذف العرض
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
        eyebrow={activeRestaurant?.nameAr || activeRestaurant?.name}
        title="العروض"
        description="أدر العروض التي تظهر لعملاء مطعمك."
        actions={
          canManageRestaurantContent ? (
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              إضافة عرض
            </AdminActionButton>
          ) : null
        }
      />

      {canManageRestaurantContent && offers.length > 0 ? (
        <div className="admin-dishes-summary" aria-label="ملخص العروض">
          <span>{offers.length} عرض</span>
          <span>{activeCount} نشط</span>
          <span>{offers.length - activeCount} متوقف</span>
        </div>
      ) : null}

      {successMessage ? <div className="admin-feedback admin-feedback--success">{successMessage}</div> : null}

      {renderContent()}

      <AdminFormModal
        isOpen={Boolean(formMode)}
        title={formMode?.type === "edit" ? "تعديل العرض" : "إضافة عرض"}
        description="أدخل بيانات العرض كما تريد أن تظهر لاحقًا للعميل."
        onClose={closeFormModal}
        size="lg"
      >
        <form className="admin-dish-form" onSubmit={handleSubmit} noValidate>
          {formError ? <div className="admin-feedback admin-feedback--error">{formError}</div> : null}

          <div className="admin-form-grid">
            <label>
              <span>عنوان العرض</span>
              <input
                value={formValues.title}
                onChange={(event) => updateFormValue("title", event.target.value)}
                aria-invalid={Boolean(formErrors.title)}
              />
              {formErrors.title ? <small>{formErrors.title}</small> : null}
            </label>

            <label>
              <span>لون العرض</span>
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
              <span>السعر بعد التخفيض</span>
              <input
                value={formValues.price}
                onChange={(event) => updateFormValue("price", event.target.value)}
                aria-invalid={Boolean(formErrors.price)}
                inputMode="decimal"
              />
              {formErrors.price ? <small>{formErrors.price}</small> : null}
            </label>

            <label>
              <span>السعر قبل التخفيض</span>
              <input
                value={formValues.oldPrice}
                onChange={(event) => updateFormValue("oldPrice", event.target.value)}
                aria-invalid={Boolean(formErrors.oldPrice)}
                inputMode="decimal"
              />
              {formErrors.oldPrice ? <small>{formErrors.oldPrice}</small> : null}
            </label>

            <label>
              <span>رابط الصورة</span>
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
              <span className="admin-field-label">رفع الصورة</span>
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
              <span>نص زر العرض</span>
              <input value={formValues.ctaText} onChange={(event) => updateFormValue("ctaText", event.target.value)} />
            </label>

            <label>
              <span>تاريخ البداية</span>
              <input
                type="datetime-local"
                value={formValues.startsAt}
                onChange={(event) => updateFormValue("startsAt", event.target.value)}
                aria-invalid={Boolean(formErrors.startsAt)}
              />
              {formErrors.startsAt ? <small>{formErrors.startsAt}</small> : null}
            </label>

            <label>
              <span>تاريخ النهاية</span>
              <input
                type="datetime-local"
                value={formValues.endsAt}
                onChange={(event) => updateFormValue("endsAt", event.target.value)}
                aria-invalid={Boolean(formErrors.endsAt)}
              />
              {formErrors.endsAt ? <small>{formErrors.endsAt}</small> : null}
            </label>

            <label>
              <span>ترتيب الظهور</span>
              <input
                value={formValues.sortOrder}
                onChange={(event) => updateFormValue("sortOrder", event.target.value)}
                aria-invalid={Boolean(formErrors.sortOrder)}
                inputMode="numeric"
              />
              {formErrors.sortOrder ? <small>{formErrors.sortOrder}</small> : null}
            </label>

            <label className="admin-form-grid__wide">
              <span>الوصف</span>
              <textarea value={formValues.description} onChange={(event) => updateFormValue("description", event.target.value)} rows={3} />
            </label>
          </div>

          <div className="admin-dish-form__checks">
            <label>
              <input type="checkbox" checked={formValues.isActive} onChange={(event) => updateFormValue("isActive", event.target.checked)} />
              <span>العرض نشط</span>
            </label>
          </div>

          <div className="admin-dish-form__actions">
            <AdminActionButton variant="ghost" onClick={closeFormModal} disabled={isSaving}>
              إلغاء
            </AdminActionButton>
            <AdminActionButton variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? "جارٍ الحفظ..." : "حفظ العرض"}
            </AdminActionButton>
          </div>
        </form>
      </AdminFormModal>

      <AdminConfirmDialog
        isOpen={Boolean(pendingDeleteOffer)}
        title="حذف العرض نهائيًا"
        message="هل أنت متأكد؟ لا يمكن التراجع عن حذف هذا العرض."
        confirmLabel="حذف العرض"
        isDanger
        isSubmitting={Boolean(pendingDeleteOffer && busyOfferId === pendingDeleteOffer.id)}
        onCancel={() => setPendingDeleteOffer(null)}
        onConfirm={() => void handleDeleteOffer()}
      />
    </section>
  );
}
