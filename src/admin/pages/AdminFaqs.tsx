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
import { mapKnownErrorToFriendlyMessage } from "../../lib/friendlyErrors";
import { useI18n } from "../../lib/i18n/I18nContext";
import { parseTranslationString, stringifyTranslations } from "../../lib/i18n/localizedContent";
import {
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
type Translate = ReturnType<typeof useI18n>["t"];

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

const validateFaqForm = (values: FaqFormValues, t: Translate): FaqFormErrors => {
  const errors: FaqFormErrors = {};
  const sortOrder = parseOptionalNumber(values.sortOrder);

  if (!values.question.trim()) {
    errors.question = t("requiredField");
  }

  if (!values.answer.trim()) {
    errors.answer = t("requiredField");
  }

  if (sortOrder !== undefined && !Number.isFinite(sortOrder)) {
    errors.sortOrder = t("invalidValue");
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

const getErrorMessage = (error: unknown, t: Translate) => mapKnownErrorToFriendlyMessage(error, t);

export default function AdminFaqs() {
  const { t } = useI18n();
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
      setPageError(getErrorMessage(error, t));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId, t]);

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

    const nextErrors = validateFaqForm(formValues, t);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !formMode) {
      return;
    }

    if (!activeRestaurantId) {
      setFormError(t("restaurantScopeMissing"));
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
      setSuccessMessage(formMode.type === "edit" ? t("faqUpdated") : t("faqSaved"));
      setFormMode(null);
    } catch (error) {
      setFormError(getErrorMessage(error, t));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async (faq: FAQItem) => {
    if (!activeRestaurantId) {
      setPageError(t("restaurantScopeMissing"));
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
      setSuccessMessage(t("changesSaved"));
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setBusyFaqId(null);
    }
  };

  const handleDeleteFaq = async () => {
    if (!pendingDeleteFaq) {
      return;
    }

    if (!activeRestaurantId) {
      setPageError(t("restaurantScopeMissing"));
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
      setSuccessMessage(t("faqDeleted"));
      setPendingDeleteFaq(null);
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setBusyFaqId(null);
    }
  };

  const renderContent = () => {
    if (scopeError) {
      return <AdminErrorState title={t("faqsTitle")} message={scopeError} />;
    }

    if (isLoading) {
      return <AdminLoadingState label={t("loading")} />;
    }

    if (pageError) {
      return (
        <AdminErrorState
          message={pageError}
          action={
            <AdminActionButton variant="secondary" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => void loadFaqs()}>
              {t("retry")}
            </AdminActionButton>
          }
        />
      );
    }

    if (faqs.length === 0) {
      return (
        <AdminEmptyState
          icon={<CircleHelp size={30} aria-hidden="true" />}
          title={t("faqsEmptyTitle")}
          body={t("faqsEmptyBody")}
          action={
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              {t("addFaq")}
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
                {typeof faq.sortOrder === "number" ? (
                  <span>
                    {t("sortOrder")}: {faq.sortOrder}
                  </span>
                ) : null}
              </div>
              <AdminStatusBadge tone={faq.isVisible ? "success" : "warning"}>
                {faq.isVisible ? t("visible") : t("hidden")}
              </AdminStatusBadge>
            </div>
            <p>{faq.answer}</p>
            <div className="admin-faq-card__actions">
              <AdminActionButton variant="secondary" icon={<Pencil size={17} aria-hidden="true" />} onClick={() => openEditModal(faq)}>
                {t("edit")}
              </AdminActionButton>
              <AdminActionButton
                variant="primary"
                icon={faq.isVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                onClick={() => void handleToggleVisibility(faq)}
                disabled={busyFaqId === faq.id}
              >
                {faq.isVisible ? t("hideFaq") : t("showFaq")}
              </AdminActionButton>
              <AdminActionButton
                variant="ghost"
                icon={<Trash2 size={17} aria-hidden="true" />}
                onClick={() => setPendingDeleteFaq(faq)}
                disabled={busyFaqId === faq.id}
              >
                {t("delete")}
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
        title={t("faqsTitle")}
        description={t("featureFaqsDescription")}
        actions={
          canManageRestaurantContent ? (
            <AdminActionButton variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={openCreateModal}>
              {t("addFaq")}
            </AdminActionButton>
          ) : null
        }
      />

      {canManageRestaurantContent && faqs.length > 0 ? (
        <div className="admin-dishes-summary" aria-label={`${t("summary")} - ${t("faqs")}`}>
          <span>
            {t("faqs")}: {faqs.length}
          </span>
          <span>
            {t("visible")}: {visibleCount}
          </span>
          <span>
            {t("hidden")}: {faqs.length - visibleCount}
          </span>
        </div>
      ) : null}

      {successMessage ? <div className="admin-feedback admin-feedback--success">{successMessage}</div> : null}

      {renderContent()}

      <AdminFormModal
        isOpen={Boolean(formMode)}
        title={formMode?.type === "edit" ? t("editFaq") : t("addFaq")}
        description={t("faqFormDescription")}
        onClose={closeFormModal}
        size="lg"
      >
        <form className="admin-dish-form" onSubmit={handleSubmit} noValidate>
          {formError ? <div className="admin-feedback admin-feedback--error">{formError}</div> : null}

          <div className="admin-form-grid">
            <label className="admin-form-grid__wide">
              <span>{t("question")}</span>
              <input
                value={formValues.question}
                onChange={(event) => updateFormValue("question", event.target.value)}
                aria-invalid={Boolean(formErrors.question)}
              />
              {formErrors.question ? <small>{formErrors.question}</small> : null}
            </label>

            <label className="admin-form-grid__wide">
              <span>{t("answer")}</span>
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
                <summary>{t("optionalTranslations")}</summary>
                <div className="admin-form-grid">
                  <label className="admin-form-grid__wide">
                    <span>{t("question")} (FR)</span>
                    <input value={formValues.frQuestion} onChange={(event) => updateFormValue("frQuestion", event.target.value)} />
                  </label>
                  <label className="admin-form-grid__wide">
                    <span>{t("answer")} (FR)</span>
                    <textarea value={formValues.frAnswer} onChange={(event) => updateFormValue("frAnswer", event.target.value)} rows={2} />
                  </label>
                  <label className="admin-form-grid__wide">
                    <span>{t("question")} (EN)</span>
                    <input value={formValues.enQuestion} onChange={(event) => updateFormValue("enQuestion", event.target.value)} />
                  </label>
                  <label className="admin-form-grid__wide">
                    <span>{t("answer")} (EN)</span>
                    <textarea value={formValues.enAnswer} onChange={(event) => updateFormValue("enAnswer", event.target.value)} rows={2} />
                  </label>
                </div>
              </details>
            ) : null}

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
          </div>

          <div className="admin-dish-form__checks">
            <label>
              <input
                type="checkbox"
                checked={formValues.isVisible}
                onChange={(event) => updateFormValue("isVisible", event.target.checked)}
              />
              <span>{t("visible")}</span>
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
        isOpen={Boolean(pendingDeleteFaq)}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage")}
        confirmLabel={t("confirmDeleteLabel")}
        isDanger
        isSubmitting={Boolean(pendingDeleteFaq && busyFaqId === pendingDeleteFaq.id)}
        onCancel={() => setPendingDeleteFaq(null)}
        onConfirm={() => void handleDeleteFaq()}
      />
    </section>
  );
}
