import { Eye, EyeOff, ImageIcon, Pencil, Plus, RefreshCw, Star, Trash2, Utensils } from "lucide-react";
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
  DishesRepositoryError,
  createDish,
  deleteDish,
  getDishesByRestaurant,
  toggleDishAvailability,
  updateDish,
  type DishMutationInput,
} from "../../services/repositories/dishesRepository";
import type { Dish } from "../../types/platform";

type DishFormValues = {
  badge: string;
  category: string;
  description: string;
  imageFileId: string;
  imageUrl: string;
  ingredients: string;
  isAvailable: boolean;
  isPopular: boolean;
  name: string;
  oldPrice: string;
  price: string;
  rating: string;
  sortOrder: string;
};

type DishFormErrors = Partial<Record<keyof DishFormValues, string>>;
type DishFormMode = { type: "create" } | { type: "edit"; dish: Dish };

const adminCurrency = "ر.س";

const emptyDishFormValues: DishFormValues = {
  badge: "",
  category: "",
  description: "",
  imageFileId: "",
  imageUrl: "",
  ingredients: "",
  isAvailable: true,
  isPopular: false,
  name: "",
  oldPrice: "",
  price: "",
  rating: "",
  sortOrder: "",
};

const formatPrice = (value: number) => `${new Intl.NumberFormat("ar-SA").format(value)} ${adminCurrency}`;
const formatOptionalNumber = (value: number | undefined) => (typeof value === "number" ? String(value) : "");
const parseOptionalNumber = (value: string) => (value.trim() ? Number(value) : undefined);

const getDishFormValues = (dish?: Dish): DishFormValues => {
  if (!dish) {
    return emptyDishFormValues;
  }

  return {
    badge: dish.badge ?? "",
    category: dish.category,
    description: dish.description,
    imageFileId: dish.imageFileId ?? "",
    imageUrl: dish.imageUrl ?? "",
    ingredients: dish.ingredients?.join("\n") ?? "",
    isAvailable: dish.isAvailable,
    isPopular: dish.isPopular,
    name: dish.name,
    oldPrice: formatOptionalNumber(dish.oldPrice),
    price: String(dish.price),
    rating: formatOptionalNumber(dish.rating),
    sortOrder: formatOptionalNumber(dish.sortOrder),
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

const validateDishForm = (values: DishFormValues): DishFormErrors => {
  const errors: DishFormErrors = {};
  const price = Number(values.price);
  const oldPrice = parseOptionalNumber(values.oldPrice);
  const rating = parseOptionalNumber(values.rating);

  if (!values.name.trim()) {
    errors.name = "اسم الطبق مطلوب";
  }

  if (!values.category.trim()) {
    errors.category = "التصنيف مطلوب";
  }

  if (!values.price.trim()) {
    errors.price = "السعر مطلوب";
  } else if (!Number.isFinite(price) || price <= 0) {
    errors.price = "السعر يجب أن يكون رقمًا أكبر من 0";
  }

  if (oldPrice !== undefined && (!Number.isFinite(oldPrice) || oldPrice <= 0)) {
    errors.oldPrice = "السعر القديم يجب أن يكون رقمًا صحيحًا إذا تم إدخاله";
  }

  if (rating !== undefined && (!Number.isFinite(rating) || rating < 0 || rating > 5)) {
    errors.rating = "التقييم يجب أن يكون بين 0 و 5";
  }

  if (values.imageUrl.trim() && !isAcceptableUrl(values.imageUrl.trim())) {
    errors.imageUrl = "رابط الصورة غير صحيح";
  }

  const sortOrder = parseOptionalNumber(values.sortOrder);
  if (sortOrder !== undefined && !Number.isFinite(sortOrder)) {
    errors.sortOrder = "ترتيب الظهور يجب أن يكون رقمًا";
  }

  return errors;
};

const toDishMutationInput = (values: DishFormValues): DishMutationInput => ({
  badge: values.badge.trim() || undefined,
  category: values.category.trim(),
  description: values.description.trim(),
  imageFileId: values.imageFileId.trim() || undefined,
  imageUrl: values.imageUrl.trim() || undefined,
  ingredients: values.ingredients
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean),
  isAvailable: values.isAvailable,
  isPopular: values.isPopular,
  name: values.name.trim(),
  oldPrice: parseOptionalNumber(values.oldPrice),
  price: Number(values.price),
  rating: parseOptionalNumber(values.rating),
  sortOrder: parseOptionalNumber(values.sortOrder),
});

const sortDishes = (dishes: Dish[]) =>
  [...dishes].sort((first, second) => {
    const orderDiff = (first.sortOrder ?? Number.MAX_SAFE_INTEGER) - (second.sortOrder ?? Number.MAX_SAFE_INTEGER);
    return orderDiff || first.name.localeCompare(second.name, "ar");
  });

const getErrorMessage = (error: unknown) => {
  if (error instanceof DishesRepositoryError) {
    return error.message;
  }

  return "تعذر تنفيذ العملية. تحقق من الاتصال أو الصلاحيات.";
};

export default function AdminDishes() {
  const { activeRestaurant, activeRestaurantId, canManageRestaurantContent, scopeError } = useActiveRestaurantScope();
  const logAction = useAuditLogger();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [formMode, setFormMode] = useState<DishFormMode | null>(null);
  const [formValues, setFormValues] = useState<DishFormValues>(emptyDishFormValues);
  const [formErrors, setFormErrors] = useState<DishFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyDishId, setBusyDishId] = useState<string | null>(null);
  const [pendingDeleteDish, setPendingDeleteDish] = useState<Dish | null>(null);
  const availableCount = useMemo(() => dishes.filter((dish) => dish.isAvailable).length, [dishes]);

  const loadDishes = useCallback(async () => {
    if (!activeRestaurantId) {
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const loadedDishes = await getDishesByRestaurant(activeRestaurantId);
      setDishes(sortDishes(loadedDishes));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId]);

  useEffect(() => {
    if (!canManageRestaurantContent || !activeRestaurantId) {
      setDishes([]);
      return;
    }

    void loadDishes();
  }, [activeRestaurantId, canManageRestaurantContent, loadDishes]);

  const openCreateModal = () => {
    setFormMode({ type: "create" });
    setFormValues(emptyDishFormValues);
    setFormErrors({});
    setFormError(null);
  };

  const openEditModal = (dish: Dish) => {
    setFormMode({ type: "edit", dish });
    setFormValues(getDishFormValues(dish));
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

  const updateFormValue = <Key extends keyof DishFormValues>(key: Key, value: DishFormValues[Key]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const nextErrors = validateDishForm(formValues);
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
      const input = toDishMutationInput(formValues);
      const savedDish =
        formMode.type === "edit"
          ? await updateDish(formMode.dish.id, input, activeRestaurantId)
          : await createDish(activeRestaurantId, input);

      setDishes((current) => {
        const nextDishes =
          formMode.type === "edit"
            ? current.map((dish) => (dish.id === savedDish.id ? savedDish : dish))
            : [savedDish, ...current];

        return sortDishes(nextDishes);
      });

      logAction({
        action: formMode.type === "edit" ? "update" : "create",
        entityType: "dish",
        entityId: savedDish.id,
        metadata: {
          name: savedDish.name,
          isAvailable: savedDish.isAvailable,
        },
      });
      setSuccessMessage("تم حفظ الطبق بنجاح");
      setFormMode(null);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAvailability = async (dish: Dish) => {
    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setBusyDishId(dish.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const updatedDish = await toggleDishAvailability(dish.id, !dish.isAvailable, activeRestaurantId);
      setDishes((current) => sortDishes(current.map((item) => (item.id === updatedDish.id ? updatedDish : item))));
      logAction({
        action: updatedDish.isAvailable ? "show" : "hide",
        entityType: "dish",
        entityId: updatedDish.id,
        metadata: { name: updatedDish.name },
      });
      setSuccessMessage(updatedDish.isAvailable ? "تم إظهار الطبق في الموقع" : "تم إخفاء الطبق من الموقع");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyDishId(null);
    }
  };

  const handleDeleteDish = async () => {
    if (!pendingDeleteDish) {
      return;
    }

    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setBusyDishId(pendingDeleteDish.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      await deleteDish(pendingDeleteDish.id, activeRestaurantId);
      setDishes((current) => current.filter((dish) => dish.id !== pendingDeleteDish.id));
      logAction({
        action: "delete",
        entityType: "dish",
        entityId: pendingDeleteDish.id,
        metadata: { name: pendingDeleteDish.name },
      });
      setSuccessMessage("تم حذف الطبق نهائيًا");
      setPendingDeleteDish(null);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyDishId(null);
    }
  };

  const renderContent = () => {
    if (scopeError) {
      return <AdminErrorState title="لا يمكن فتح إدارة الأطباق" message={scopeError} />;
    }

    if (isLoading) {
      return <AdminLoadingState label="جارٍ تحميل الأطباق..." />;
    }

    if (pageError) {
      return (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadDishes()}>
              إعادة المحاولة
            </AdminActionButton>
          }
        />
      );
    }

    if (dishes.length === 0) {
      return (
        <AdminEmptyState
          icon={<Utensils size={30} aria-hidden="true" />}
          title="لا توجد أطباق بعد"
          body="ابدأ بإضافة أول طبق ليظهر هنا داخل لوحة التحكم."
          action={
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              إضافة طبق
            </AdminActionButton>
          }
        />
      );
    }

    return (
      <div className="admin-dishes-grid">
        {dishes.map((dish) => (
          <AdminCard as="article" className="admin-dish-card" key={dish.id}>
            <div className="admin-dish-card__image">
              {dish.imageUrl ? (
                <img src={dish.imageUrl} alt={dish.name} loading="lazy" />
              ) : (
                <div className="admin-dish-card__placeholder">
                  <ImageIcon size={34} aria-hidden="true" />
                </div>
              )}
              {dish.badge ? <span>{dish.badge}</span> : null}
            </div>

            <div className="admin-dish-card__body">
              <div className="admin-dish-card__heading">
                <div>
                  <h3>{dish.name}</h3>
                  <p>{dish.category}</p>
                </div>
                <AdminStatusBadge tone={dish.isAvailable ? "success" : "warning"}>
                  {dish.isAvailable ? "متاح في الموقع" : "مخفي من الموقع"}
                </AdminStatusBadge>
              </div>

              {dish.description ? <p className="admin-dish-card__description">{dish.description}</p> : null}

              <div className="admin-dish-card__meta">
                <div>
                  <strong>{formatPrice(dish.price)}</strong>
                  {dish.oldPrice ? <del>{formatPrice(dish.oldPrice)}</del> : null}
                </div>
                {typeof dish.rating === "number" ? (
                  <span>
                    <Star size={16} aria-hidden="true" />
                    {dish.rating}
                  </span>
                ) : null}
              </div>

              <div className="admin-dish-card__flags">
                {dish.isPopular ? <span>الأكثر طلبًا</span> : null}
                {typeof dish.sortOrder === "number" ? <span>ترتيب {dish.sortOrder}</span> : null}
              </div>

              <div className="admin-dish-card__actions">
                <AdminActionButton variant="secondary" icon={<Pencil size={17} aria-hidden="true" />} onClick={() => openEditModal(dish)}>
                  تعديل
                </AdminActionButton>
                <AdminActionButton
                  variant="primary"
                  icon={dish.isAvailable ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                  onClick={() => void handleToggleAvailability(dish)}
                  disabled={busyDishId === dish.id}
                >
                  {dish.isAvailable ? "إخفاء الطبق" : "إظهار الطبق"}
                </AdminActionButton>
                <AdminActionButton
                  variant="ghost"
                  icon={<Trash2 size={17} aria-hidden="true" />}
                  onClick={() => setPendingDeleteDish(dish)}
                  disabled={busyDishId === dish.id}
                >
                  حذف نهائي
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
        title="الأطباق والمنيو"
        description="أدر الأطباق التي تظهر في موقع مطعمك."
        actions={
          canManageRestaurantContent ? (
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              إضافة طبق
            </AdminActionButton>
          ) : null
        }
      />

      {canManageRestaurantContent && dishes.length > 0 ? (
        <div className="admin-dishes-summary" aria-label="ملخص الأطباق">
          <span>{dishes.length} طبق</span>
          <span>{availableCount} متاح</span>
          <span>{dishes.length - availableCount} مخفي</span>
        </div>
      ) : null}

      {successMessage ? <div className="admin-feedback admin-feedback--success">{successMessage}</div> : null}

      {renderContent()}

      <AdminFormModal
        isOpen={Boolean(formMode)}
        title={formMode?.type === "edit" ? "تعديل الطبق" : "إضافة طبق"}
        description="أدخل بيانات الطبق كما تريد أن تظهر للعميل."
        onClose={closeFormModal}
        size="lg"
      >
        <form className="admin-dish-form" onSubmit={handleSubmit} noValidate>
          {formError ? <div className="admin-feedback admin-feedback--error">{formError}</div> : null}

          <div className="admin-form-grid">
            <label>
              <span>اسم الطبق</span>
              <input
                value={formValues.name}
                onChange={(event) => updateFormValue("name", event.target.value)}
                aria-invalid={Boolean(formErrors.name)}
              />
              {formErrors.name ? <small>{formErrors.name}</small> : null}
            </label>

            <label>
              <span>التصنيف</span>
              <input
                value={formValues.category}
                onChange={(event) => updateFormValue("category", event.target.value)}
                aria-invalid={Boolean(formErrors.category)}
                placeholder="الأطباق الرئيسية"
              />
              {formErrors.category ? <small>{formErrors.category}</small> : null}
            </label>

            <label>
              <span>السعر</span>
              <input
                value={formValues.price}
                onChange={(event) => updateFormValue("price", event.target.value)}
                aria-invalid={Boolean(formErrors.price)}
                inputMode="decimal"
              />
              {formErrors.price ? <small>{formErrors.price}</small> : null}
            </label>

            <label>
              <span>السعر القديم</span>
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
                placeholder="https://example.com/image.jpg"
              />
              {formErrors.imageUrl ? <small>{formErrors.imageUrl}</small> : null}
            </label>

            <div className="admin-form-grid__wide">
              <span className="admin-field-label">رفع الصورة</span>
              <AdminImageUploader
                restaurantId={activeRestaurantId ?? ""}
                type="dish"
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
              <span>شارة قصيرة</span>
              <input value={formValues.badge} onChange={(event) => updateFormValue("badge", event.target.value)} />
            </label>

            <label>
              <span>التقييم</span>
              <input
                value={formValues.rating}
                onChange={(event) => updateFormValue("rating", event.target.value)}
                aria-invalid={Boolean(formErrors.rating)}
                inputMode="decimal"
                placeholder="4.8"
              />
              {formErrors.rating ? <small>{formErrors.rating}</small> : null}
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

            <label className="admin-form-grid__wide">
              <span>المكونات</span>
              <textarea
                value={formValues.ingredients}
                onChange={(event) => updateFormValue("ingredients", event.target.value)}
                rows={3}
                placeholder="اكتب كل مكون في سطر"
              />
            </label>
          </div>

          <div className="admin-dish-form__checks">
            <label>
              <input
                type="checkbox"
                checked={formValues.isPopular}
                onChange={(event) => updateFormValue("isPopular", event.target.checked)}
              />
              <span>الأكثر طلبًا</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={formValues.isAvailable}
                onChange={(event) => updateFormValue("isAvailable", event.target.checked)}
              />
              <span>متاح في الموقع</span>
            </label>
          </div>

          <div className="admin-dish-form__actions">
            <AdminActionButton variant="ghost" onClick={closeFormModal} disabled={isSaving}>
              إلغاء
            </AdminActionButton>
            <AdminActionButton variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? "جارٍ الحفظ..." : "حفظ الطبق"}
            </AdminActionButton>
          </div>
        </form>
      </AdminFormModal>

      <AdminConfirmDialog
        isOpen={Boolean(pendingDeleteDish)}
        title="حذف الطبق نهائيًا"
        message="هل أنت متأكد؟ لا يمكن التراجع عن حذف هذا الطبق."
        confirmLabel="حذف نهائي"
        isDanger
        isSubmitting={Boolean(pendingDeleteDish && busyDishId === pendingDeleteDish.id)}
        onCancel={() => setPendingDeleteDish(null)}
        onConfirm={() => void handleDeleteDish()}
      />
    </section>
  );
}
