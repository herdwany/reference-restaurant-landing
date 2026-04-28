import { Languages } from "lucide-react";
import { useI18n } from "../lib/i18n/I18nContext";
import type { LanguageCode } from "../lib/i18n/languages";

type LanguageSwitcherProps = {
  className?: string;
  enabledLanguages?: LanguageCode[];
};

export default function LanguageSwitcher({ className = "", enabledLanguages }: LanguageSwitcherProps) {
  const { availableLanguages, currentLanguage, setLanguage, t } = useI18n();
  const visibleLanguages = enabledLanguages?.length
    ? availableLanguages.filter((language) => enabledLanguages.includes(language.code))
    : availableLanguages;

  return (
    <label className={`language-switcher ${className}`.trim()}>
      <Languages size={16} aria-hidden="true" />
      <span className="sr-only">{t("language")}</span>
      <select
        aria-label={t("language")}
        value={currentLanguage}
        onChange={(event) => setLanguage(event.target.value as LanguageCode)}
      >
        {visibleLanguages.map((language) => (
          <option value={language.code} key={language.code}>
            {language.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
