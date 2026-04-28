import { getPlanDefinition } from "./plans";
import type { ClientPlan, FeatureFlagKey, FeatureFlags, Restaurant, RestaurantStatus, UserRole } from "../types/platform";

export const getPlanFeatures = (plan: ClientPlan | undefined): FeatureFlags => ({
  ...getPlanDefinition(plan).features,
});

export const mergeRestaurantFeatures = (
  plan: ClientPlan | undefined,
  customFeatures?: Partial<FeatureFlags>,
): FeatureFlags => ({
  ...getPlanFeatures(plan),
  ...(customFeatures ?? {}),
});

export const hasFeature = (restaurant: Pick<Restaurant, "features" | "plan"> | null | undefined, featureKey: FeatureFlagKey) => {
  if (!restaurant) {
    return false;
  }

  return mergeRestaurantFeatures(restaurant.plan, restaurant.features)[featureKey];
};

export const isRestaurantSuspended = (restaurant: Pick<Restaurant, "status"> | null | undefined) =>
  restaurant?.status === "suspended" || restaurant?.status === "cancelled";

export const isPublicRestaurantUnavailable = (status: RestaurantStatus | undefined) =>
  status === "draft" || status === "suspended" || status === "cancelled";

export const canCurrentUserBypassFeatureGate = (role?: UserRole | null) => role === "agency_admin";

export const canAccessAdminFeature = (
  restaurant: Pick<Restaurant, "features" | "plan" | "status"> | null | undefined,
  featureKey: FeatureFlagKey,
  role?: UserRole | null,
) => {
  if (canCurrentUserBypassFeatureGate(role)) {
    return true;
  }

  if (!restaurant || isRestaurantSuspended(restaurant)) {
    return false;
  }

  return hasFeature(restaurant, featureKey);
};
