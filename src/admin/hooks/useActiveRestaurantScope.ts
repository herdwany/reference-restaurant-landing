import { useMemo } from "react";
import { useAuth } from "../../context/AuthContext";

export function useActiveRestaurantScope() {
  const { restaurant, restaurantId, role } = useAuth();

  return useMemo(() => {
    if (role === "agency_admin") {
      return {
        activeRestaurantId: null,
        activeRestaurant: null,
        role,
        canManageRestaurantContent: false,
        scopeError: "لوحة الوكالة لم تُفعّل بعد. اختر مطعمًا أولًا من لوحة الوكالة لاحقًا.",
      };
    }

    if (role === "owner" || role === "staff") {
      if (!restaurantId) {
        return {
          activeRestaurantId: null,
          activeRestaurant: restaurant,
          role,
          canManageRestaurantContent: false,
          scopeError: "لم يتم ربط هذا الحساب بمطعم بعد.",
        };
      }

      return {
        activeRestaurantId: restaurantId,
        activeRestaurant: restaurant,
        role,
        canManageRestaurantContent: true,
        scopeError: null,
      };
    }

    return {
      activeRestaurantId: null,
      activeRestaurant: null,
      role,
      canManageRestaurantContent: false,
      scopeError: "لا يمكن تحديد صلاحية إدارة محتوى المطعم لهذا الحساب.",
    };
  }, [restaurant, restaurantId, role]);
}
