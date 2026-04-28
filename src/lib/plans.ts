import type { ClientPlan, FeatureFlags, SupportLevel } from "../types/platform";

export type PlanDefinition = {
  features: FeatureFlags;
  label: string;
  supportLevel: SupportLevel;
};

const starterFeatures: FeatureFlags = {
  canManageDishes: true,
  canManageOffers: true,
  canManageOrders: false,
  canManageReservations: false,
  canUploadImages: true,
  canManageGallery: false,
  canCustomizeBrand: false,
  canUseCustomDomain: false,
  canAccessActivityLogs: false,
  canUseAdvancedTheme: false,
};

const proFeatures: FeatureFlags = {
  canManageDishes: true,
  canManageOffers: true,
  canManageOrders: true,
  canManageReservations: true,
  canUploadImages: true,
  canManageGallery: true,
  canCustomizeBrand: true,
  canUseCustomDomain: false,
  canAccessActivityLogs: true,
  canUseAdvancedTheme: false,
};

const premiumFeatures: FeatureFlags = {
  ...proFeatures,
  canUseCustomDomain: true,
  canUseAdvancedTheme: true,
};

export const clientPlans = ["starter", "pro", "premium", "managed"] as const satisfies readonly ClientPlan[];

export const planDefinitions: Record<ClientPlan, PlanDefinition> = {
  starter: {
    label: "Starter",
    supportLevel: "basic",
    features: starterFeatures,
  },
  pro: {
    label: "Pro",
    supportLevel: "standard",
    features: proFeatures,
  },
  premium: {
    label: "Premium",
    supportLevel: "priority",
    features: premiumFeatures,
  },
  managed: {
    label: "Managed",
    supportLevel: "managed",
    features: {
      canManageDishes: true,
      canManageOffers: true,
      canManageOrders: true,
      canManageReservations: true,
      canUploadImages: true,
      canManageGallery: true,
      canCustomizeBrand: true,
      canUseCustomDomain: true,
      canAccessActivityLogs: true,
      canUseAdvancedTheme: true,
    },
  },
};

export const getPlanDefinition = (plan: ClientPlan | undefined) => planDefinitions[plan ?? "starter"];

export const getDefaultSupportLevelForPlan = (plan: ClientPlan | undefined) => getPlanDefinition(plan).supportLevel;
