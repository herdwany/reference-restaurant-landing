import type { CSSProperties } from "react";
import type { RestaurantConfig } from "../data/restaurantConfig";

export type PublicThemeStyle = CSSProperties & Record<string, string>;

export const themePresetColors = {
  classic_red: null,
  black_gold: {
    primaryColor: "#161616",
    secondaryColor: "#b88a2d",
    accentColor: "#f4c76b",
    successColor: "#16a34a",
    darkColor: "#151515",
    lightColor: "#faf7ef",
    borderColor: "#e4d7bc",
  },
  coffee: {
    primaryColor: "#7c3f24",
    secondaryColor: "#b26a34",
    accentColor: "#e7b76b",
    successColor: "#15803d",
    darkColor: "#24150f",
    lightColor: "#fff7ed",
    borderColor: "#ead8c5",
  },
  fresh: {
    primaryColor: "#15803d",
    secondaryColor: "#0f766e",
    accentColor: "#facc15",
    successColor: "#16a34a",
    darkColor: "#10251b",
    lightColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  minimal: {
    primaryColor: "#111827",
    secondaryColor: "#6b7280",
    accentColor: "#d97706",
    successColor: "#16a34a",
    darkColor: "#111827",
    lightColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
} as const;

export const getPublicThemeBrand = (config: RestaurantConfig) => {
  const themePreset = config.settings.themePreset || "classic_red";
  const presetColors = themePresetColors[themePreset];

  return presetColors ? { ...config.brand, ...presetColors } : config.brand;
};

export const getPublicThemeStyle = (config: RestaurantConfig): PublicThemeStyle => {
  const brand = getPublicThemeBrand(config);

  return {
    "--admin-accent": brand.accentColor,
    "--admin-bg": brand.lightColor,
    "--admin-border": brand.borderColor,
    "--admin-ink": brand.darkColor,
    "--admin-primary": brand.primaryColor,
    "--admin-secondary": brand.secondaryColor,
    "--admin-surface": "#fff",
    "--color-accent": brand.accentColor,
    "--color-border": brand.borderColor,
    "--color-dark": brand.darkColor,
    "--color-light": brand.lightColor,
    "--color-primary": brand.primaryColor,
    "--color-secondary": brand.secondaryColor,
    "--color-success": brand.successColor,
    "--radius-card": brand.borderRadius,
  };
};

export const getPublicThemeClassNames = (config: RestaurantConfig, baseClassName = "app") => {
  const themePreset = config.settings.themePreset || "classic_red";
  const fontPreset = config.settings.fontPreset || "modern";
  const cardStyle = config.settings.cardStyle || "soft";
  const buttonStyle = config.settings.buttonStyle || "rounded";
  const headerStyle = config.settings.headerStyle || "clean";
  const footerStyle = config.settings.footerStyle || "dark";
  const sectionSpacing = config.settings.sectionSpacing || "normal";
  const backgroundStyle = config.settings.backgroundStyle || "warm";

  return [
    baseClassName,
    `app--theme-${themePreset}`,
    `app--font-${fontPreset}`,
    `app--cards-${cardStyle}`,
    `app--buttons-${buttonStyle}`,
    `app--header-${headerStyle}`,
    `app--footer-${footerStyle}`,
    `app--spacing-${sectionSpacing}`,
    `app--background-${backgroundStyle}`,
  ].join(" ");
};
