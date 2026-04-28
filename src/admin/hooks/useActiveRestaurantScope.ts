import { useMemo } from "react";
import { getAgencySelectedRestaurant } from "../../agency/agencySelection";
import { useAuth } from "../../context/AuthContext";
import { canAccessAdminFeature, hasFeature, isRestaurantSuspended } from "../../lib/featureAccess";
import type { ClientPlan, FeatureFlagKey, Restaurant, RestaurantStatus, UserRole } from "../../types/platform";

type ActiveRestaurantScope = {
  activeRestaurant: Restaurant | null;
  activeRestaurantId: string | null;
  activeRestaurantName: string | null;
  activeRestaurantPlan: ClientPlan | null;
  activeRestaurantSlug: string | null;
  activeRestaurantStatus: RestaurantStatus | null;
  canAccessFeature: (featureKey: FeatureFlagKey) => boolean;
  clientHasFeature: (featureKey: FeatureFlagKey) => boolean;
  canManageRestaurantContent: boolean;
  requiresAgencySelection: boolean;
  role: UserRole | null;
  scopeError: string | null;
};

export const AGENCY_RESTAURANT_SELECTION_REQUIRED_MESSAGE = "اختر مطعمًا من لوحة الوكالة أولًا.";

export function useActiveRestaurantScope() {
  const { restaurant, restaurantId, role } = useAuth();

  return useMemo<ActiveRestaurantScope>(() => {
    if (role === "agency_admin") {
      const selectedRestaurant = getAgencySelectedRestaurant();

      if (selectedRestaurant) {
        return {
          activeRestaurantId: selectedRestaurant.selectedRestaurantId,
          activeRestaurant: null,
          activeRestaurantName: selectedRestaurant.selectedRestaurantName,
          activeRestaurantPlan: selectedRestaurant.plan ?? null,
          activeRestaurantSlug: selectedRestaurant.selectedRestaurantSlug,
          activeRestaurantStatus: selectedRestaurant.status ?? null,
          role,
          canAccessFeature: () => true,
          clientHasFeature: (featureKey) =>
            selectedRestaurant.plan ? hasFeature({ plan: selectedRestaurant.plan, features: undefined }, featureKey) : true,
          canManageRestaurantContent: true,
          requiresAgencySelection: false,
          scopeError: null,
        };
      }

      return {
        activeRestaurantId: null,
        activeRestaurant: null,
        activeRestaurantName: null,
        activeRestaurantPlan: null,
        activeRestaurantSlug: null,
        activeRestaurantStatus: null,
        role,
        canAccessFeature: () => false,
        clientHasFeature: () => false,
        canManageRestaurantContent: false,
        requiresAgencySelection: true,
        scopeError: AGENCY_RESTAURANT_SELECTION_REQUIRED_MESSAGE,
      };
    }

    if (role === "owner" || role === "staff") {
      if (!restaurantId) {
        return {
          activeRestaurantId: null,
          activeRestaurant: restaurant,
          activeRestaurantName: restaurant?.nameAr || restaurant?.name || null,
          activeRestaurantPlan: restaurant?.plan ?? null,
          activeRestaurantSlug: restaurant?.slug ?? null,
          activeRestaurantStatus: restaurant?.status ?? null,
          role,
          canAccessFeature: () => false,
          clientHasFeature: () => false,
          canManageRestaurantContent: false,
          requiresAgencySelection: false,
          scopeError: "لم يتم ربط هذا الحساب بمطعم بعد.",
        };
      }

      if (isRestaurantSuspended(restaurant)) {
        return {
          activeRestaurantId: restaurantId,
          activeRestaurant: restaurant,
          activeRestaurantName: restaurant?.nameAr || restaurant?.name || null,
          activeRestaurantPlan: restaurant?.plan ?? null,
          activeRestaurantSlug: restaurant?.slug ?? null,
          activeRestaurantStatus: restaurant?.status ?? null,
          role,
          canAccessFeature: () => false,
          clientHasFeature: (featureKey) => hasFeature(restaurant, featureKey),
          canManageRestaurantContent: false,
          requiresAgencySelection: false,
          scopeError:
            restaurant?.status === "cancelled"
              ? "هذا الحساب غير متاح حاليًا. تواصل مع Pixel One لتفعيله."
              : "هذا الموقع غير متاح مؤقتًا. تواصل مع Pixel One لتفعيل الإدارة.",
        };
      }

      return {
        activeRestaurantId: restaurantId,
        activeRestaurant: restaurant,
        activeRestaurantName: restaurant?.nameAr || restaurant?.name || null,
        activeRestaurantPlan: restaurant?.plan ?? null,
        activeRestaurantSlug: restaurant?.slug ?? null,
        activeRestaurantStatus: restaurant?.status ?? null,
        role,
        canAccessFeature: (featureKey) =>
          restaurant ? canAccessAdminFeature(restaurant, featureKey, role) : hasFeature({ plan: "starter", features: undefined }, featureKey),
        clientHasFeature: (featureKey) => hasFeature(restaurant ?? { plan: "starter", features: undefined }, featureKey),
        canManageRestaurantContent: true,
        requiresAgencySelection: false,
        scopeError: null,
      };
    }

    return {
      activeRestaurantId: null,
      activeRestaurant: null,
      activeRestaurantName: null,
      activeRestaurantPlan: null,
      activeRestaurantSlug: null,
      activeRestaurantStatus: null,
      role,
      canAccessFeature: () => false,
      clientHasFeature: () => false,
      canManageRestaurantContent: false,
      requiresAgencySelection: false,
      scopeError: "لا يمكن تحديد صلاحية إدارة محتوى المطعم لهذا الحساب.",
    };
  }, [restaurant, restaurantId, role]);
}
