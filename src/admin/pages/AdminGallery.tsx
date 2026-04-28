import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, ImageIcon, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
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
import {
  GalleryRepositoryError,
  createGalleryItem,
  deleteGalleryItem,
  getGalleryItemsByRestaurant,
  toggleGalleryItemVisibility,
  updateGalleryItem,
  type GalleryItemMutationInput,
} from "../../services/repositories/galleryRepository";
import type { GalleryItem } from "../../types/platform";

type GalleryFormValues = {
  alt: string;
  imageFileId: string;
  imageUrl: string;
  isVisible: boolean;
  sortOrder: string;
  title: string;
};

type GalleryFormErrors = Partial<Record<keyof GalleryFormValues, string>>;
type GalleryFormMode = { type: "create" } | { type: "edit"; item: GalleryItem };

const emptyGalleryFormValues: GalleryFormValues = {
  alt: "",
  imageFileId: "",
  imageUrl: "",
  isVisible: true,
  sortOrder: "",
  title: "",
};

const formatOptionalNumber = (value: number | undefined) => (typeof value === "number" ? String(value) : "");
const parseOptionalNumber = (value: string) => (value.trim() ? Number(value) : undefined);

const getGalleryFormValues = (item?: GalleryItem): GalleryFormValues => {
  if (!item) {
    return emptyGalleryFormValues;
  }

  return {
    alt: item.alt ?? "",
    imageFileId: item.imageFileId ?? "",
    imageUrl: item.imageUrl ?? "",
    isVisible: item.isVisible,
    sortOrder: formatOptionalNumber(item.sortOrder),
    title: item.title,
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

const validateGalleryForm = (values: GalleryFormValues): GalleryFormErrors => {
  const errors: GalleryFormErrors = {};
  const sortOrder = parseOptionalNumber(values.sortOrder);

  if (!values.title.trim()) {
    errors.title = "عنوان الصورة مطلوب";
  }

  if (!values.imageFileId.trim() && !values.imageUrl.trim()) {
    errors.imageUrl = "يجب رفع صورة أو وضع رابط صورة";
  }

  if (values.imageUrl.trim() && !isAcceptableUrl(values.imageUrl.trim())) {
    errors.imageUrl = "رابط الصورة غير صحيح";
  }

  if (sortOrder !== undefined && !Number.isFinite(sortOrder)) {
    errors.sortOrder = "ترتيب الظهور يجب أن يكون رقمًا";
  }

  return errors;
};

const toGalleryMutationInput = (values: GalleryFormValues): GalleryItemMutationInput => ({
  alt: values.alt.trim() || values.title.trim(),
  imageFileId: values.imageFileId.trim() || undefined,
  imageUrl: values.imageUrl.trim() || undefined,
  isVisible: values.isVisible,
  sortOrder: parseOptionalNumber(values.sortOrder),
  title: values.title.trim(),
});

const sortGalleryItems = (items: GalleryItem[]) =>
  [...items].sort((first, second) => {
    const orderDiff = (first.sortOrder ?? Number.MAX_SAFE_INTEGER) - (second.sortOrder ?? Number.MAX_SAFE_INTEGER);
    return orderDiff || first.title.localeCompare(second.title, "ar");
  });

const getErrorMessage = (error: unknown) => {
  if (error instanceof GalleryRepositoryError) {
    return error.message;
  }

  return "تعذر تنفيذ العملية. تحقق من الاتصال أو الصلاحيات.";
};

export default function AdminGallery() {
  const {
    activeRestaurant,
    activeRestaurantId,
    activeRestaurantName,
    canAccessFeature,
    canManageRestaurantContent,
    scopeError,
  } = useActiveRestaurantScope();
  const logAction = useAuditLogger();
  const canUseGallery = canAccessFeature("canManageGallery");
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [formMode, setFormMode] = useState<GalleryFormMode | null>(null);
  const [formValues, setFormValues] = useState<GalleryFormValues>(emptyGalleryFormValues);
  const [formErrors, setFormErrors] = useState<GalleryFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<GalleryItem | null>(null);
  const visibleCount = useMemo(() => galleryItems.filter((item) => item.isVisible).length, [galleryItems]);

  const loadGalleryItems = useCallback(async () => {
    if (!activeRestaurantId) {
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const loadedItems = await getGalleryItemsByRestaurant(activeRestaurantId);
      setGalleryItems(sortGalleryItems(loadedItems));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId]);

  useEffect(() => {
    if (!canManageRestaurantContent || !canUseGallery || !activeRestaurantId) {
      setGalleryItems([]);
      return;
    }

    void loadGalleryItems();
  }, [activeRestaurantId, canManageRestaurantContent, canUseGallery, loadGalleryItems]);

  const openCreateModal = () => {
    setFormMode({ type: "create" });
    setFormValues(emptyGalleryFormValues);
    setFormErrors({});
    setFormError(null);
  };

  const openEditModal = (item: GalleryItem) => {
    setFormMode({ type: "edit", item });
    setFormValues(getGalleryFormValues(item));
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

  const updateFormValue = <Key extends keyof GalleryFormValues>(key: Key, value: GalleryFormValues[Key]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const nextErrors = validateGalleryForm(formValues);
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
      const input = toGalleryMutationInput(formValues);
      const savedItem =
        formMode.type === "edit"
          ? await updateGalleryItem(formMode.item.id, input, activeRestaurantId)
          : await createGalleryItem(activeRestaurantId, input);

      setGalleryItems((current) => {
        const nextItems =
          formMode.type === "edit"
            ? current.map((item) => (item.id === savedItem.id ? savedItem : item))
            : [savedItem, ...current];

        return sortGalleryItems(nextItems);
      });

      logAction({
        action: formMode.type === "edit" ? "update" : "create",
        entityType: "gallery",
        entityId: savedItem.id,
        metadata: {
          name: savedItem.title,
          isVisible: savedItem.isVisible,
        },
      });
      setSuccessMessage("تم حفظ صورة المعرض بنجاح");
      setFormMode(null);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async (item: GalleryItem) => {
    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setBusyItemId(item.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const updatedItem = await toggleGalleryItemVisibility(item.id, !item.isVisible, activeRestaurantId);
      setGalleryItems((current) => sortGalleryItems(current.map((currentItem) => (currentItem.id === updatedItem.id ? updatedItem : currentItem))));
      logAction({
        action: updatedItem.isVisible ? "show" : "hide",
        entityType: "gallery",
        entityId: updatedItem.id,
        metadata: { name: updatedItem.title },
      });
      setSuccessMessage(updatedItem.isVisible ? "تم إظهار الصورة في الموقع" : "تم إخفاء الصورة من الموقع");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDeleteGalleryItem = async () => {
    if (!pendingDeleteItem) {
      return;
    }

    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setBusyItemId(pendingDeleteItem.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      await deleteGalleryItem(pendingDeleteItem.id, activeRestaurantId);
      setGalleryItems((current) => current.filter((item) => item.id !== pendingDeleteItem.id));
      logAction({
        action: "delete",
        entityType: "gallery",
        entityId: pendingDeleteItem.id,
        metadata: { name: pendingDeleteItem.title },
      });
      setSuccessMessage("تم حذف صورة المعرض نهائيًا");
      setPendingDeleteItem(null);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyItemId(null);
    }
  };

  const renderContent = () => {
    if (scopeError) {
      return <AdminErrorState title="لا يمكن فتح معرض الصور" message={scopeError} />;
    }

    if (!canUseGallery) {
      return <AdminFeatureUnavailable featureName="معرض الصور" />;
    }

    if (isLoading) {
      return <AdminLoadingState label="جارٍ تحميل صور المعرض..." />;
    }

    if (pageError) {
      return (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadGalleryItems()}>
              إعادة المحاولة
            </AdminActionButton>
          }
        />
      );
    }

    if (galleryItems.length === 0) {
      return (
        <AdminEmptyState
          icon={<ImageIcon size={30} aria-hidden="true" />}
          title="لا توجد صور في المعرض بعد"
          body="أضف أول صورة لتظهر في قسم أجواء المطعم."
          action={
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              إضافة صورة
            </AdminActionButton>
          }
        />
      );
    }

    return (
      <div className="admin-dishes-grid admin-gallery-grid">
        {galleryItems.map((item) => (
          <AdminCard as="article" className="admin-dish-card admin-gallery-card" key={item.id}>
            <div className="admin-dish-card__image">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.alt || item.title} loading="lazy" />
              ) : (
                <div className="admin-dish-card__placeholder">
                  <ImageIcon size={34} aria-hidden="true" />
                </div>
              )}
              <span>{item.isVisible ? "ظاهر" : "مخفي"}</span>
            </div>

            <div className="admin-dish-card__body">
              <div className="admin-dish-card__heading">
                <div>
                  <h3>{item.title}</h3>
                  {item.alt ? <p>{item.alt}</p> : null}
                </div>
                <AdminStatusBadge tone={item.isVisible ? "success" : "warning"}>{item.isVisible ? "ظاهرة" : "مخفية"}</AdminStatusBadge>
              </div>

              <div className="admin-dish-card__flags">
                {typeof item.sortOrder === "number" ? <span>ترتيب {item.sortOrder}</span> : <span>بدون ترتيب</span>}
              </div>

              <div className="admin-dish-card__actions">
                <AdminActionButton variant="secondary" icon={<Pencil size={17} aria-hidden="true" />} onClick={() => openEditModal(item)}>
                  تعديل
                </AdminActionButton>
                <AdminActionButton
                  variant="primary"
                  icon={item.isVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                  onClick={() => void handleToggleVisibility(item)}
                  disabled={busyItemId === item.id}
                >
                  {item.isVisible ? "إخفاء" : "إظهار"}
                </AdminActionButton>
                <AdminActionButton
                  variant="ghost"
                  icon={<Trash2 size={17} aria-hidden="true" />}
                  onClick={() => setPendingDeleteItem(item)}
                  disabled={busyItemId === item.id}
                >
                  حذف
                </AdminActionButton>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>
    );
  };

  return (
    <section className="admin-gallery-page">
      <AdminPageHeader
        eyebrow={activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name}
        title="معرض الصور"
        description="أدر الصور التي تظهر في قسم أجواء المطعم."
        actions={
          canManageRestaurantContent && canUseGallery ? (
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              إضافة صورة
            </AdminActionButton>
          ) : null
        }
      />

      {canManageRestaurantContent && canUseGallery && galleryItems.length > 0 ? (
        <div className="admin-dishes-summary" aria-label="ملخص معرض الصور">
          <span>{galleryItems.length} صورة</span>
          <span>{visibleCount} ظاهرة</span>
          <span>{galleryItems.length - visibleCount} مخفية</span>
        </div>
      ) : null}

      {successMessage ? <div className="admin-feedback admin-feedback--success">{successMessage}</div> : null}

      {renderContent()}

      <AdminFormModal
        isOpen={Boolean(formMode)}
        title={formMode?.type === "edit" ? "تعديل صورة" : "إضافة صورة"}
        description="أدخل بيانات الصورة كما تريد أن تظهر في معرض الموقع العام."
        onClose={closeFormModal}
        size="lg"
      >
        <form className="admin-dish-form" onSubmit={handleSubmit} noValidate>
          {formError ? <div className="admin-feedback admin-feedback--error">{formError}</div> : null}

          <div className="admin-form-grid">
            <label>
              <span>عنوان الصورة</span>
              <input
                value={formValues.title}
                onChange={(event) => updateFormValue("title", event.target.value)}
                aria-invalid={Boolean(formErrors.title)}
              />
              {formErrors.title ? <small>{formErrors.title}</small> : null}
            </label>

            <label>
              <span>النص البديل</span>
              <input value={formValues.alt} onChange={(event) => updateFormValue("alt", event.target.value)} />
            </label>

            <label>
              <span>رابط الصورة</span>
              <input
                value={formValues.imageUrl}
                onChange={(event) => updateFormValue("imageUrl", event.target.value)}
                aria-invalid={Boolean(formErrors.imageUrl)}
                inputMode="url"
                placeholder="https://example.com/gallery.jpg"
              />
              {formErrors.imageUrl ? <small>{formErrors.imageUrl}</small> : null}
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

            <div className="admin-form-grid__wide">
              <span className="admin-field-label">رفع صورة للمعرض</span>
              <AdminImageUploader
                restaurantId={activeRestaurantId ?? ""}
                type="gallery"
                value={{
                  imageFileId: formValues.imageFileId || undefined,
                  imageUrl: formValues.imageUrl || undefined,
                }}
                onChange={(nextValue) => {
                  updateFormValue("imageFileId", nextValue.imageFileId ?? "");
                  updateFormValue("imageUrl", nextValue.imageUrl ?? "");
                }}
                onUploaded={(asset) =>
                  logAction({
                    action: "upload",
                    entityType: "image",
                    entityId: asset.fileId,
                    metadata: {
                      type: "gallery",
                      fileName: asset.fileName,
                    },
                  })
                }
                disabled={isSaving || !activeRestaurantId}
              />
            </div>
          </div>

          <div className="admin-dish-form__checks">
            <label>
              <input
                type="checkbox"
                checked={formValues.isVisible}
                onChange={(event) => updateFormValue("isVisible", event.target.checked)}
              />
              <span>ظاهرة في الموقع</span>
            </label>
          </div>

          <div className="admin-dish-form__actions">
            <AdminActionButton variant="ghost" onClick={closeFormModal} disabled={isSaving}>
              إلغاء
            </AdminActionButton>
            <AdminActionButton variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? "جارٍ الحفظ..." : "حفظ الصورة"}
            </AdminActionButton>
          </div>
        </form>
      </AdminFormModal>

      <AdminConfirmDialog
        isOpen={Boolean(pendingDeleteItem)}
        title="حذف صورة المعرض نهائيًا"
        message="هل أنت متأكد؟ لا يمكن التراجع عن حذف هذه الصورة من المعرض."
        confirmLabel="حذف الصورة"
        isDanger
        isSubmitting={Boolean(pendingDeleteItem && busyItemId === pendingDeleteItem.id)}
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={() => void handleDeleteGalleryItem()}
      />
    </section>
  );
}
