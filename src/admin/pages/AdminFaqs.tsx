import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CircleHelp, Eye, EyeOff, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import AdminActionButton from "../components/AdminActionButton";
import AdminCard from "../components/AdminCard";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import AdminEmptyState from "../components/AdminEmptyState";
import AdminErrorState from "../components/AdminErrorState";
import AdminFormModal from "../components/AdminFormModal";
import AdminLoadingState from "../components/AdminLoadingState";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminStatusBadge from "../components/AdminStatusBadge";
import { useActiveRestaurantScope } from "../hooks/useActiveRestaurantScope";
import { useAuditLogger } from "../hooks/useAuditLogger";
import { parseTranslationString, stringifyTranslations } from "../../lib/i18n/localizedContent";
import {
  FaqRepositoryError,
  createFaq,
  deleteFaq,
  getFaqsByRestaurant,
  toggleFaqVisibility,
  updateFaq,
  type FaqMutationInput,
} from "../../services/repositories/faqRepository";
import type { FAQItem } from "../../types/platform";

type FaqFormValues = {
  answer: string;
  frQuestion: string;
  frAnswer: string;
  enQuestion: string;
  enAnswer: string;
  isVisible: boolean;
  question: string;
  sortOrder: string;
};

type FaqFormErrors = Partial<Record<keyof FaqFormValues, string>>;
type FaqFormMode = { type: "create" } | { type: "edit"; faq: FAQItem };

const emptyFaqFormValues: FaqFormValues = {
  answer: "",
  frQuestion: "",
  frAnswer: "",
  enQuestion: "",
  enAnswer: "",
  isVisible: true,
  question: "",
  sortOrder: "",
};

const formatOptionalNumber = (value: number | undefined) => (typeof value === "number" ? String(value) : "");
const parseOptionalNumber = (value: string) => (value.trim() ? Number(value) : undefined);

const getFaqFormValues = (faq?: FAQItem): FaqFormValues => {
  if (!faq) {
    return emptyFaqFormValues;
  }

  const translations = parseTranslationString(faq.translations);

  return {
    answer: faq.answer,
    frQuestion: String(translations.fr?.question ?? ""),
    frAnswer: String(translations.fr?.answer ?? ""),
    enQuestion: String(translations.en?.question ?? ""),
    enAnswer: String(translations.en?.answer ?? ""),
    isVisible: faq.isVisible,
    question: faq.question,
    sortOrder: formatOptionalNumber(faq.sortOrder),
  };
};

const validateFaqForm = (values: FaqFormValues): FaqFormErrors => {
  const errors: FaqFormErrors = {};
  const sortOrder = parseOptionalNumber(values.sortOrder);

  if (!values.question.trim()) {
    errors.question = "السؤال مطلوب";
  }

  if (!values.answer.trim()) {
    errors.answer = "الجواب مطلوب";
  }

  if (sortOrder !== undefined && !Number.isFinite(sortOrder)) {
    errors.sortOrder = "ترتيب الظهور يجب أن يكون رقمًا";
  }

  return errors;
};

const toFaqMutationInput = (values: FaqFormValues, canSaveTranslations: boolean): FaqMutationInput => ({
  answer: values.answer.trim(),
  translations: canSaveTranslations
    ? stringifyTranslations({
        fr: {
          question: values.frQuestion,
          answer: values.frAnswer,
        },
        en: {
          question: values.enQuestion,
          answer: values.enAnswer,
        },
      })
    : undefined,
  isVisible: values.isVisible,
  question: values.question.trim(),
  sortOrder: parseOptionalNumber(values.sortOrder),
});

const sortFaqs = (faqs: FAQItem[]) =>
  [...faqs].sort((first, second) => {
    const orderDiff = (first.sortOrder ?? Number.MAX_SAFE_INTEGER) - (second.sortOrder ?? Number.MAX_SAFE_INTEGER);
    return orderDiff || first.question.localeCompare(second.question, "ar");
  });

const getErrorMessage = (error: unknown) => {
  if (error instanceof FaqRepositoryError) {
    return error.message;
  }

  return "تعذر تنفيذ العملية. تحقق من الاتصال أو الصلاحيات.";
};

export default function AdminFaqs() {
  const { activeRestaurant, activeRestaurantId, activeRestaurantName, canAccessFeature, canManageRestaurantContent, scopeError } = useActiveRestaurantScope();
  const logAction = useAuditLogger();
  const canSaveTranslations = canAccessFeature("canCustomizeBrand");
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [formMode, setFormMode] = useState<FaqFormMode | null>(null);
  const [formValues, setFormValues] = useState<FaqFormValues>(emptyFaqFormValues);
  const [formErrors, setFormErrors] = useState<FaqFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyFaqId, setBusyFaqId] = useState<string | null>(null);
  const [pendingDeleteFaq, setPendingDeleteFaq] = useState<FAQItem | null>(null);
  const visibleCount = useMemo(() => faqs.filter((faq) => faq.isVisible).length, [faqs]);

  const loadFaqs = useCallback(async () => {
    if (!activeRestaurantId) {
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const loadedFaqs = await getFaqsByRestaurant(activeRestaurantId);
      setFaqs(sortFaqs(loadedFaqs));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId]);

  useEffect(() => {
    if (!canManageRestaurantContent || !activeRestaurantId) {
      setFaqs([]);
      return;
    }

    void loadFaqs();
  }, [activeRestaurantId, canManageRestaurantContent, loadFaqs]);

  const openCreateModal = () => {
    setFormMode({ type: "create" });
    setFormValues(emptyFaqFormValues);
    setFormErrors({});
    setFormError(null);
  };

  const openEditModal = (faq: FAQItem) => {
    setFormMode({ type: "edit", faq });
    setFormValues(getFaqFormValues(faq));
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

  const updateFormValue = <Key extends keyof FaqFormValues>(key: Key, value: FaqFormValues[Key]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const nextErrors = validateFaqForm(formValues);
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
      const input = toFaqMutationInput(formValues, canSaveTranslations);
      if (!canSaveTranslations && formMode.type === "edit") {
        input.translations = formMode.faq.translations;
      }
      const savedFaq =
        formMode.type === "edit"
          ? await updateFaq(formMode.faq.id, input, activeRestaurantId)
          : await createFaq(activeRestaurantId, input);

      setFaqs((current) => {
        const nextFaqs =
          formMode.type === "edit"
            ? current.map((faq) => (faq.id === savedFaq.id ? savedFaq : faq))
            : [savedFaq, ...current];

        return sortFaqs(nextFaqs);
      });

      logAction({
        action: formMode.type === "edit" ? "update" : "create",
        entityType: "faq",
        entityId: savedFaq.id,
        metadata: { name: savedFaq.question },
      });
      setSuccessMessage("تم حفظ السؤال بنجاح");
      setFormMode(null);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async (faq: FAQItem) => {
    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setBusyFaqId(faq.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const updatedFaq = await toggleFaqVisibility(faq.id, !faq.isVisible, activeRestaurantId);
      setFaqs((current) => sortFaqs(current.map((item) => (item.id === updatedFaq.id ? updatedFaq : item))));
      logAction({
        action: updatedFaq.isVisible ? "show" : "hide",
        entityType: "faq",
        entityId: updatedFaq.id,
        metadata: { name: updatedFaq.question },
      });
      setSuccessMessage(updatedFaq.isVisible ? "تم إظهار السؤال في الموقع" : "تم إخفاء السؤال من الموقع");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyFaqId(null);
    }
  };

  const handleDeleteFaq = async () => {
    if (!pendingDeleteFaq) {
      return;
    }

    if (!activeRestaurantId) {
      setPageError("تعذر تحديد المطعم الحالي.");
      return;
    }

    setBusyFaqId(pendingDeleteFaq.id);
    setPageError(null);
    setSuccessMessage(null);

    try {
      await deleteFaq(pendingDeleteFaq.id, activeRestaurantId);
      setFaqs((current) => current.filter((faq) => faq.id !== pendingDeleteFaq.id));
      logAction({
        action: "delete",
        entityType: "faq",
        entityId: pendingDeleteFaq.id,
        metadata: { name: pendingDeleteFaq.question },
      });
      setSuccessMessage("تم حذف السؤال نهائيًا");
      setPendingDeleteFaq(null);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyFaqId(null);
    }
  };

  const renderContent = () => {
    if (scopeError) {
      return <AdminErrorState title="لا يمكن فتح الأسئلة الشائعة" message={scopeError} />;
    }

    if (isLoading) {
      return <AdminLoadingState label="جارٍ تحميل الأسئلة الشائعة..." />;
    }

    if (pageError) {
      return (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadFaqs()}>
              إعادة المحاولة
            </AdminActionButton>
          }
        />
      );
    }

    if (faqs.length === 0) {
      return (
        <AdminEmptyState
          icon={<CircleHelp size={30} aria-hidden="true" />}
          title="لا توجد أسئلة بعد"
          body="ابدأ بإضافة أول سؤال ليظهر هنا داخل لوحة التحكم."
          action={
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              إضافة سؤال
            </AdminActionButton>
          }
        />
      );
    }

    return (
      <div className="admin-faq-grid">
        {faqs.map((faq) => (
          <AdminCard as="article" className="admin-faq-card" key={faq.id}>
            <div className="admin-faq-card__header">
              <div>
                <h3>{faq.question}</h3>
                {typeof faq.sortOrder === "number" ? <span>ترتيب {faq.sortOrder}</span> : null}
              </div>
              <AdminStatusBadge tone={faq.isVisible ? "success" : "warning"}>{faq.isVisible ? "ظاهر" : "مخفي"}</AdminStatusBadge>
            </div>
            <p>{faq.answer}</p>
            <div className="admin-faq-card__actions">
              <AdminActionButton variant="secondary" icon={<Pencil size={17} aria-hidden="true" />} onClick={() => openEditModal(faq)}>
                تعديل
              </AdminActionButton>
              <AdminActionButton
                variant="primary"
                icon={faq.isVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                onClick={() => void handleToggleVisibility(faq)}
                disabled={busyFaqId === faq.id}
              >
                {faq.isVisible ? "إخفاء" : "إظهار"}
              </AdminActionButton>
              <AdminActionButton
                variant="ghost"
                icon={<Trash2 size={17} aria-hidden="true" />}
                onClick={() => setPendingDeleteFaq(faq)}
                disabled={busyFaqId === faq.id}
              >
                حذف
              </AdminActionButton>
            </div>
          </AdminCard>
        ))}
      </div>
    );
  };

  return (
    <section className="admin-faqs-page">
      <AdminPageHeader
        eyebrow={activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name}
        title="الأسئلة الشائعة"
        description="أدر الأسئلة التي تظهر في موقع مطعمك."
        actions={
          canManageRestaurantContent ? (
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              إضافة سؤال
            </AdminActionButton>
          ) : null
        }
      />

      {canManageRestaurantContent && faqs.length > 0 ? (
        <div className="admin-dishes-summary" aria-label="ملخص الأسئلة الشائعة">
          <span>{faqs.length} سؤال</span>
          <span>{visibleCount} ظاهر</span>
          <span>{faqs.length - visibleCount} مخفي</span>
        </div>
      ) : null}

      {successMessage ? <div className="admin-feedback admin-feedback--success">{successMessage}</div> : null}

      {renderContent()}

      <AdminFormModal
        isOpen={Boolean(formMode)}
        title={formMode?.type === "edit" ? "تعديل سؤال" : "إضافة سؤال"}
        description="أدخل السؤال والجواب كما تريد أن يظهرا في الموقع العام."
        onClose={closeFormModal}
        size="lg"
      >
        <form className="admin-dish-form" onSubmit={handleSubmit} noValidate>
          {formError ? <div className="admin-feedback admin-feedback--error">{formError}</div> : null}

          <div className="admin-form-grid">
            <label className="admin-form-grid__wide">
              <span>السؤال</span>
              <input
                value={formValues.question}
                onChange={(event) => updateFormValue("question", event.target.value)}
                aria-invalid={Boolean(formErrors.question)}
              />
              {formErrors.question ? <small>{formErrors.question}</small> : null}
            </label>

            <label className="admin-form-grid__wide">
              <span>الجواب</span>
              <textarea
                value={formValues.answer}
                onChange={(event) => updateFormValue("answer", event.target.value)}
                aria-invalid={Boolean(formErrors.answer)}
                rows={4}
              />
              {formErrors.answer ? <small>{formErrors.answer}</small> : null}
            </label>

            {canSaveTranslations ? (
              <details className="admin-form-grid__wide admin-translation-panel">
                <summary>ترجمات اختيارية</summary>
                <div className="admin-form-grid">
                  <label className="admin-form-grid__wide">
                    <span>Fr question</span>
                    <input value={formValues.frQuestion} onChange={(event) => updateFormValue("frQuestion", event.target.value)} />
                  </label>
                  <label className="admin-form-grid__wide">
                    <span>Fr answer</span>
                    <textarea value={formValues.frAnswer} onChange={(event) => updateFormValue("frAnswer", event.target.value)} rows={2} />
                  </label>
                  <label className="admin-form-grid__wide">
                    <span>En question</span>
                    <input value={formValues.enQuestion} onChange={(event) => updateFormValue("enQuestion", event.target.value)} />
                  </label>
                  <label className="admin-form-grid__wide">
                    <span>En answer</span>
                    <textarea value={formValues.enAnswer} onChange={(event) => updateFormValue("enAnswer", event.target.value)} rows={2} />
                  </label>
                </div>
              </details>
            ) : null}

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
          </div>

          <div className="admin-dish-form__checks">
            <label>
              <input
                type="checkbox"
                checked={formValues.isVisible}
                onChange={(event) => updateFormValue("isVisible", event.target.checked)}
              />
              <span>ظاهر في الموقع</span>
            </label>
          </div>

          <div className="admin-dish-form__actions">
            <AdminActionButton variant="ghost" onClick={closeFormModal} disabled={isSaving}>
              إلغاء
            </AdminActionButton>
            <AdminActionButton variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? "جارٍ الحفظ..." : "حفظ السؤال"}
            </AdminActionButton>
          </div>
        </form>
      </AdminFormModal>

      <AdminConfirmDialog
        isOpen={Boolean(pendingDeleteFaq)}
        title="حذف السؤال نهائيًا"
        message="هل أنت متأكد؟ لا يمكن التراجع عن حذف هذا السؤال."
        confirmLabel="حذف السؤال"
        isDanger
        isSubmitting={Boolean(pendingDeleteFaq && busyFaqId === pendingDeleteFaq.id)}
        onCancel={() => setPendingDeleteFaq(null)}
        onConfirm={() => void handleDeleteFaq()}
      />
    </section>
  );
}
