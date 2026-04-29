import type { UserRole } from "../types/platform";
import type { UiDictionaryKey } from "../lib/i18n/uiDictionary";

type Translate = (key: UiDictionaryKey) => string;

export const getRoleLabel = (role: UserRole | null, t: Translate) => {
  switch (role) {
    case "agency_admin":
      return t("roleAgencyAdmin");
    case "owner":
      return t("roleOwner");
    case "staff":
      return t("roleStaff");
    default:
      return t("roleUnknown");
  }
};
