import { isAppwriteConfigured } from "./appwriteClient";

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID?.trim() ?? "";
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID?.trim() ?? "";
export const CREATE_ORDER_FUNCTION_ID = import.meta.env.VITE_APPWRITE_CREATE_ORDER_FUNCTION_ID?.trim() ?? "";
export const CREATE_RESERVATION_FUNCTION_ID = import.meta.env.VITE_APPWRITE_CREATE_RESERVATION_FUNCTION_ID?.trim() ?? "";
export const TRACK_REQUEST_FUNCTION_ID = import.meta.env.VITE_APPWRITE_TRACK_REQUEST_FUNCTION_ID?.trim() ?? "";
export const CREATE_CLIENT_FUNCTION_ID = import.meta.env.VITE_APPWRITE_CREATE_CLIENT_FUNCTION_ID?.trim() ?? "";
export const UPDATE_CLIENT_CONTROLS_FUNCTION_ID = import.meta.env.VITE_APPWRITE_UPDATE_CLIENT_CONTROLS_FUNCTION_ID?.trim() ?? "";
export const UPDATE_DOMAIN_SETTINGS_FUNCTION_ID = import.meta.env.VITE_APPWRITE_UPDATE_DOMAIN_SETTINGS_FUNCTION_ID?.trim() ?? "";
export const DEFAULT_RESTAURANT_SLUG =
  import.meta.env.VITE_APPWRITE_DEFAULT_RESTAURANT_SLUG?.trim() || "demo-restaurant";
export const ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS === "true";
const buildMode = import.meta.env.MODE?.trim().toLowerCase() ?? "";
export const isStagingBuild = buildMode === "staging";
export const isProductionBuild = import.meta.env.PROD && !isStagingBuild;
export const isDevelopmentBuild = import.meta.env.DEV;

// appwrite@24 supports TablesDB and Rows. Keep these IDs as table IDs, not legacy collection IDs.
export const COLLECTIONS = {
  restaurants: "restaurants",
  profiles: "profiles",
  dishes: "dishes",
  offers: "offers",
  galleryItems: "gallery_items",
  testimonials: "testimonials",
  faqs: "faqs",
  siteSettings: "site_settings",
  orders: "orders",
  orderItems: "order_items",
  reservations: "reservations",
  auditLogs: "audit_logs",
} as const;

export const TABLES = COLLECTIONS;

export const hasAppwriteDataConfig = isAppwriteConfigured && Boolean(DATABASE_ID);
export const hasAppwriteStorageConfig = isAppwriteConfigured && Boolean(BUCKET_ID);
export const hasCreateOrderFunctionConfig = isAppwriteConfigured && Boolean(CREATE_ORDER_FUNCTION_ID);
export const hasCreateReservationFunctionConfig = isAppwriteConfigured && Boolean(CREATE_RESERVATION_FUNCTION_ID);
export const hasTrackRequestFunctionConfig = isAppwriteConfigured && Boolean(TRACK_REQUEST_FUNCTION_ID);
export const hasCreateClientFunctionConfig = isAppwriteConfigured && Boolean(CREATE_CLIENT_FUNCTION_ID);
export const hasUpdateClientControlsFunctionConfig = isAppwriteConfigured && Boolean(UPDATE_CLIENT_CONTROLS_FUNCTION_ID);
export const hasUpdateDomainSettingsFunctionConfig = isAppwriteConfigured && Boolean(UPDATE_DOMAIN_SETTINGS_FUNCTION_ID);
export const canUseDirectSensitiveTableFallback = isDevelopmentBuild || isStagingBuild;
