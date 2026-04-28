import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  availableLanguages,
  fallbackLanguage,
  getLanguageDirection,
  normalizeLanguageCode,
  type LanguageCode,
  type LanguageDirection,
} from "./languages";
import { uiDictionary, type UiDictionaryKey } from "./uiDictionary";

type I18nContextValue = {
  availableLanguages: typeof availableLanguages;
  currentLanguage: LanguageCode;
  direction: LanguageDirection;
  setLanguage: (language: LanguageCode) => void;
  t: (key: UiDictionaryKey) => string;
};

const storageKey = "pixelone.language";

const getInitialLanguage = (): LanguageCode => {
  if (typeof window === "undefined") {
    return fallbackLanguage;
  }

  const storedLanguage = window.localStorage.getItem(storageKey);
  if (storedLanguage) {
    return normalizeLanguageCode(storedLanguage);
  }

  return fallbackLanguage;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  children: ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(getInitialLanguage);
  const direction = getLanguageDirection(currentLanguage);

  useEffect(() => {
    window.localStorage.setItem(storageKey, currentLanguage);
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = direction;
    document.documentElement.classList.toggle("dir-rtl", direction === "rtl");
    document.documentElement.classList.toggle("dir-ltr", direction === "ltr");
  }, [currentLanguage, direction]);

  const value = useMemo<I18nContextValue>(
    () => ({
      availableLanguages,
      currentLanguage,
      direction,
      setLanguage: (language) => setCurrentLanguage(normalizeLanguageCode(language)),
      t: (key) => uiDictionary[currentLanguage][key] ?? uiDictionary[fallbackLanguage][key] ?? key,
    }),
    [currentLanguage, direction],
  );

  return (
    <I18nContext.Provider value={value}>
      <div className={`i18n-root dir-${direction}`} dir={direction} lang={currentLanguage}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return context;
}
