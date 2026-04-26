import { Query, type Models } from "appwrite";
import { COLLECTIONS } from "../../lib/appwriteIds";
import type { Profile, UserRole } from "../../types/platform";
import { getFirstRow } from "./readRows";

const USER_ROLES = ["agency_admin", "owner", "staff"] as const satisfies readonly UserRole[];

type ProfileRepositoryErrorCode = "UNKNOWN_ROLE";

export class ProfileRepositoryError extends Error {
  code: ProfileRepositoryErrorCode;

  constructor(message: string, code: ProfileRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "ProfileRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

interface ProfileRow extends Models.Row {
  userId: string;
  restaurantId?: string | null;
  teamId?: string | null;
  role: string;
  fullName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
}

export const isKnownUserRole = (role: string): role is UserRole =>
  USER_ROLES.includes(role as UserRole);

const mapProfile = (row: ProfileRow): Profile => {
  if (!isKnownUserRole(row.role)) {
    throw new ProfileRepositoryError("صلاحية غير معروفة.", "UNKNOWN_ROLE");
  }

  return {
    id: row.$id,
    userId: row.userId,
    restaurantId: row.restaurantId ?? undefined,
    teamId: row.teamId ?? undefined,
    role: row.role,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone ?? undefined,
    isActive: row.isActive,
    createdAt: row.$createdAt,
    updatedAt: row.$updatedAt,
  };
};

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  if (!userId.trim()) {
    return null;
  }

  try {
    const row = await getFirstRow<ProfileRow>(COLLECTIONS.profiles, [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);

    return row ? mapProfile(row) : null;
  } catch (error) {
    if (error instanceof ProfileRepositoryError) {
      throw error;
    }

    return null;
  }
}
