export type LanguageCode = "ar" | "fr" | "en";
export type LanguageDirection = "rtl" | "ltr";

export type LanguageOption = {
  code: LanguageCode;
  direction: LanguageDirection;
  label: string;
  nativeLabel: string;
};

export const fallbackLanguage: LanguageCode = "ar";

export const availableLanguages: LanguageOption[] = [
  { code: "ar", direction: "rtl", label: "Arabic", nativeLabel: "العربية" },
  { code: "fr", direction: "ltr", label: "French", nativeLabel: "Français" },
  { code: "en", direction: "ltr", label: "English", nativeLabel: "English" },
];

const supportedLanguages = new Set<LanguageCode>(availableLanguages.map((language) => language.code));

export function normalizeLanguageCode(locale: string | undefined | null): LanguageCode {
  const normalized = locale?.trim().toLowerCase().split("-")[0] ?? "";
  return supportedLanguages.has(normalized as LanguageCode) ? (normalized as LanguageCode) : fallbackLanguage;
}

export function isSupportedLanguage(locale: string | undefined | null): locale is LanguageCode {
  const normalized = locale?.trim().toLowerCase().split("-")[0] ?? "";
  return supportedLanguages.has(normalized as LanguageCode);
}

export function getLanguageDirection(locale: string | undefined | null): LanguageDirection {
  const code = normalizeLanguageCode(locale);
  return availableLanguages.find((language) => language.code === code)?.direction ?? "rtl";
}
