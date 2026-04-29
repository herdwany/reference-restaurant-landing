import { AppwriteException } from "appwrite";
import type { UiDictionaryKey } from "./i18n/uiDictionary";

type Translate = (key: UiDictionaryKey) => string;

const toMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "";
};

export const mapKnownErrorToFriendlyMessage = (error: unknown, t: Translate) => {
  const message = toMessage(error).toLowerCase();
  const code = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "";

  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return t("accessDenied");
  }

  if (code === "APPWRITE_NOT_CONFIGURED" || message.includes("not configured") || message.includes("function id")) {
    return t("appwriteSetupRequired");
  }

  if (code === "INVALID_INPUT" || message.includes("invalid") || message.includes("required")) {
    return t("invalidValue");
  }

  if (message.includes("permission") || message.includes("unauthorized") || message.includes("forbidden") || message.includes("صلاح")) {
    return t("accessDenied");
  }

  if (message.includes("restaurantid") || message.includes("restaurant id") || message.includes("scope") || message.includes("المطعم")) {
    return t("restaurantScopeMissing");
  }

  if (message.includes("network") || message.includes("failed to fetch") || message.includes("connection") || message.includes("الاتصال")) {
    return t("networkError");
  }

  if (message.includes("plan") || message.includes("feature") || message.includes("باقة") || message.includes("الميزة")) {
    return t("planRestrictionMessage");
  }

  return t("operationFailed");
};

export const normalizeUserFacingError = (message: string | null | undefined, t: Translate) => {
  if (!message) {
    return t("operationFailed");
  }

  return mapKnownErrorToFriendlyMessage(new Error(message), t);
};
