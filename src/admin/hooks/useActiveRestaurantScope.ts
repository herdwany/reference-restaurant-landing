import { useMemo } from "react";
import { getAgencySelectedRestaurant } from "../../agency/agencySelection";
import { useAuth } from "../../context/AuthContext";
import type { Restaurant, UserRole } from "../../types/platform";

type ActiveRestaurantScope = {
  activeRestaurant: Restaurant | null;
  activeRestaurantId: string | null;
  activeRestaurantName: string | null;
  activeRestaurantSlug: string | null;
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
          activeRestaurantSlug: selectedRestaurant.selectedRestaurantSlug,
          role,
          canManageRestaurantContent: true,
          requiresAgencySelection: false,
          scopeError: null,
        };
      }

      return {
        activeRestaurantId: null,
        activeRestaurant: null,
        activeRestaurantName: null,
        activeRestaurantSlug: null,
        role,
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
          activeRestaurantSlug: restaurant?.slug ?? null,
          role,
          canManageRestaurantContent: false,
          requiresAgencySelection: false,
          scopeError: "لم يتم ربط هذا الحساب بمطعم بعد.",
        };
      }

      return {
        activeRestaurantId: restaurantId,
        activeRestaurant: restaurant,
        activeRestaurantName: restaurant?.nameAr || restaurant?.name || null,
        activeRestaurantSlug: restaurant?.slug ?? null,
        role,
        canManageRestaurantContent: true,
        requiresAgencySelection: false,
        scopeError: null,
      };
    }

    return {
      activeRestaurantId: null,
      activeRestaurant: null,
      activeRestaurantName: null,
      activeRestaurantSlug: null,
      role,
      canManageRestaurantContent: false,
      requiresAgencySelection: false,
      scopeError: "لا يمكن تحديد صلاحية إدارة محتوى المطعم لهذا الحساب.",
    };
  }, [restaurant, restaurantId, role]);
}
