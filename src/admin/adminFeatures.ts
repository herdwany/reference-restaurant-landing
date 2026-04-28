import type { FeatureFlagKey, UserRole } from "../types/platform";

export type AdminFeatureStatus = "active" | "coming_soon";

export type AdminFeatureIconName =
  | "calendarCheck"
  | "circleHelp"
  | "eye"
  | "history"
  | "image"
  | "layoutDashboard"
  | "settings"
  | "shoppingBag"
  | "tag"
  | "utensils";

export type AdminFeature = {
  id: "overview" | "dishes" | "offers" | "settings" | "faqs" | "orders" | "reservations" | "gallery" | "activity" | "preview";
  label: string;
  path: string;
  icon: AdminFeatureIconName;
  status: AdminFeatureStatus;
  requiredRoles: readonly UserRole[];
  description: string;
  placement: "main" | "footer";
  featureKey?: FeatureFlagKey;
  allowWhenFeatureDisabled?: boolean;
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
    featureKey: "canManageDishes",
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
    featureKey: "canManageOffers",
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
    featureKey: "canCustomizeBrand",
    allowWhenFeatureDisabled: true,
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
    featureKey: "canManageOrders",
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
    featureKey: "canManageReservations",
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
    featureKey: "canManageGallery",
  },
  {
    id: "activity",
    label: "سجل النشاط",
    path: "/admin/activity",
    icon: "history",
    status: "active",
    requiredRoles: restaurantRoles,
    description: "راجع آخر العمليات المهمة التي تمت داخل لوحة التحكم.",
    placement: "main",
    featureKey: "canAccessActivityLogs",
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

// TODO Phase 9 hardening: selectedRestaurantId is MVP UI context only.
// Enforce agency access with Teams/Functions/backend rules before production.
export const adminMainFeatures: readonly AdminFeature[] = adminFeatures.filter((feature) => feature.placement === "main");
export const adminFooterFeatures: readonly AdminFeature[] = adminFeatures.filter((feature) => feature.placement === "footer");

export const getAdminFeatureForPath = (pathname: string) => {
  const activeFeature = adminMainFeatures
    .filter((feature) => feature.status === "active")
    .find((feature) => (feature.path === "/admin" ? pathname === "/admin" : pathname.startsWith(feature.path)));

  return activeFeature ?? adminMainFeatures[0];
};
