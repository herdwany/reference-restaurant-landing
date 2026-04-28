import { fallbackLanguage, type LanguageCode } from "./languages";

type TranslationValue = string | number | boolean | null | undefined;
export type TranslationFields = Record<string, TranslationValue>;
export type TranslationMap = Partial<Record<LanguageCode, TranslationFields>>;

export type TranslatableEntity = {
  translations?: string | TranslationMap | null;
};

const parseTranslations = (value: TranslatableEntity["translations"]): TranslationMap => {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value as TranslationMap;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as TranslationMap) : {};
  } catch {
    return {};
  }
};

const normalizeTranslatedValue = (value: TranslationValue) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
};

export function getLocalizedField<Entity extends TranslatableEntity>(
  entity: Entity | null | undefined,
  fieldName: keyof Entity | string,
  language: LanguageCode,
): string {
  if (!entity) {
    return "";
  }

  const entityRecord = entity as Record<string, unknown>;
  const baseValue = normalizeTranslatedValue(entityRecord[String(fieldName)] as TranslationValue);

  if (language === fallbackLanguage) {
    return baseValue;
  }

  const translations = parseTranslations(entity.translations);
  const translatedValue = normalizeTranslatedValue(translations[language]?.[String(fieldName)]);

  return translatedValue || baseValue;
}

export function getLocalizedContent<Entity extends TranslatableEntity>(
  entity: Entity,
  language: LanguageCode,
  fields?: readonly string[],
): Entity {
  const fieldNames = fields ?? Object.keys(parseTranslations(entity.translations)[language] ?? {});
  const localized = { ...entity };

  for (const fieldName of fieldNames) {
    const localizedValue = getLocalizedField(entity, fieldName, language);

    if (localizedValue) {
      (localized as Record<string, unknown>)[fieldName] = localizedValue;
    }
  }

  return localized;
}

export function parseTranslationString(value: string | TranslationMap | null | undefined): TranslationMap {
  return parseTranslations(value);
}

export function stringifyTranslations(translations: TranslationMap): string | undefined {
  const cleaned = Object.fromEntries(
    Object.entries(translations)
      .map(([language, fields]) => [
        language,
        Object.fromEntries(
          Object.entries(fields ?? {})
            .map(([field, value]) => [field, normalizeTranslatedValue(value)])
            .filter(([, value]) => Boolean(value)),
        ),
      ])
      .filter(([, fields]) => Object.keys(fields as TranslationFields).length > 0),
  ) as TranslationMap;

  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : undefined;
}
