import type { UserRole } from "../types/platform";

export const getRoleLabel = (role: UserRole | null) => {
  switch (role) {
    case "agency_admin":
      return "مدير وكالة";
    case "owner":
      return "مالك";
    case "staff":
      return "موظف";
    default:
      return "غير محدد";
  }
};
