import { useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { createAuditLog } from "../../services/repositories/auditLogsRepository";
import type { AuditLogMetadata } from "../../types/platform";
import { useActiveRestaurantScope } from "./useActiveRestaurantScope";

type LogActionInput = {
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: AuditLogMetadata;
};

export function useAuditLogger() {
  const { currentUser, profile, restaurantId, role } = useAuth();
  const { activeRestaurantId } = useActiveRestaurantScope();

  return useCallback(
    ({ action, entityType, entityId, metadata }: LogActionInput) => {
      const scopedRestaurantId = activeRestaurantId ?? profile?.restaurantId ?? restaurantId ?? undefined;
      const userId = profile?.userId || currentUser?.$id;

      if (!scopedRestaurantId || (role !== "owner" && role !== "staff" && role !== "agency_admin")) {
        return;
      }

      void createAuditLog({
        restaurantId: scopedRestaurantId,
        userId,
        action,
        entityType,
        entityId,
        metadata,
      });
    },
    [activeRestaurantId, currentUser?.$id, profile?.restaurantId, profile?.userId, restaurantId, role],
  );
}
