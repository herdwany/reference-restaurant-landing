import { useMemo } from "react";
import { getAgencySelectedRestaurant } from "../../agency/agencySelection";
import { useAuth } from "../../context/AuthContext";
import { canAccessAdminFeature, hasFeature, isRestaurantSuspended } from "../../lib/featureAccess";
import { useI18n } from "../../lib/i18n/I18nContext";
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

export function useActiveRestaurantScope() {
  const { restaurant, restaurantId, role } = useAuth();
  const { t } = useI18n();

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
        scopeError: t("agencySelectionRequired"),
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
          scopeError: t("restaurantScopeMissing"),
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
              ? t("siteCancelled")
              : t("siteSuspended"),
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
      scopeError: t("accessDenied"),
    };
  }, [restaurant, restaurantId, role, t]);
}
