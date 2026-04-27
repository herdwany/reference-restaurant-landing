import type { UserRole } from "../types/platform";

export type AdminFeatureStatus = "active" | "coming_soon";

export type AdminFeatureIconName =
  | "calendarCheck"
  | "circleHelp"
  | "eye"
  | "image"
  | "layoutDashboard"
  | "settings"
  | "shoppingBag"
  | "tag"
  | "utensils";

export type AdminFeature = {
  id: "overview" | "dishes" | "offers" | "settings" | "faqs" | "orders" | "reservations" | "gallery" | "preview";
  label: string;
  path: string;
  icon: AdminFeatureIconName;
  status: AdminFeatureStatus;
  requiredRoles: readonly UserRole[];
  description: string;
  placement: "main" | "footer";
};

const restaurantRoles = ["owner", "staff", "agency_admin"] as const satisfies readonly UserRole[];

export const adminFeatures = [
  {
    id: "overview",
    label: "نظرة عامة",
    path: "/admin",
    icon: "layoutDashboard",
    status: "active",
    requiredRoles: restaurantRoles,
    description: "ملخص حالة المطعم وحساب لوحة التحكم.",
    placement: "main",
  },
  {
    id: "dishes",
    label: "الأطباق والمنيو",
    path: "/admin/dishes",
    icon: "utensils",
    status: "active",
    requiredRoles: restaurantRoles,
    description: "إدارة الأطباق التي تظهر في موقع المطعم.",
    placement: "main",
  },
  {
    id: "offers",
    label: "العروض",
    path: "/admin/offers",
    icon: "tag",
    status: "active",
    requiredRoles: restaurantRoles,
    description: "إدارة العروض الموسمية والخصومات.",
    placement: "main",
  },
  {
    id: "settings",
    label: "الإعدادات",
    path: "/admin/settings",
    icon: "settings",
    status: "active",
    requiredRoles: restaurantRoles,
    description: "إدارة بيانات التواصل وإعدادات ظهور الموقع.",
    placement: "main",
  },
  {
    id: "faqs",
    label: "الأسئلة الشائعة",
    path: "/admin/faqs",
    icon: "circleHelp",
    status: "active",
    requiredRoles: restaurantRoles,
    description: "إدارة الأسئلة والأجوبة التي تظهر في الموقع.",
    placement: "main",
  },
  {
    id: "orders",
    label: "الطلبات",
    path: "/admin/orders",
    icon: "shoppingBag",
    status: "active",
    requiredRoles: restaurantRoles,
    description: "متابعة طلبات الموقع وتحديث حالتها.",
    placement: "main",
  },
  {
    id: "reservations",
    label: "الحجوزات",
    path: "/admin/reservations",
    icon: "calendarCheck",
    status: "active",
    requiredRoles: restaurantRoles,
    description: "متابعة حجوزات الطاولات وتأكيدها.",
    placement: "main",
  },
  {
    id: "gallery",
    label: "معرض الصور",
    path: "/admin/gallery",
    icon: "image",
    status: "active",
    requiredRoles: restaurantRoles,
    description: "إدارة الصور التي تظهر في قسم أجواء المطعم.",
    placement: "main",
  },
  {
    id: "preview",
    label: "معاينة الموقع",
    path: "/",
    icon: "eye",
    status: "active",
    requiredRoles: restaurantRoles,
    description: "فتح الموقع العام الحالي.",
    placement: "footer",
  },
] as const satisfies readonly AdminFeature[];

// TODO: Future agency flow:
// agency_admin opens /agency, selects a restaurant, then selectedRestaurantId becomes
// the active admin scope for /admin/dishes, /admin/offers, and the other CMS modules.
export const adminMainFeatures: readonly AdminFeature[] = adminFeatures.filter((feature) => feature.placement === "main");
export const adminFooterFeatures: readonly AdminFeature[] = adminFeatures.filter((feature) => feature.placement === "footer");

export const getAdminFeatureForPath = (pathname: string) => {
  const activeFeature = adminMainFeatures
    .filter((feature) => feature.status === "active")
    .find((feature) => (feature.path === "/admin" ? pathname === "/admin" : pathname.startsWith(feature.path)));

  return activeFeature ?? adminMainFeatures[0];
};
