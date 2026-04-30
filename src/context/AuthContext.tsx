import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Profile, Restaurant, UserRole } from "../types/platform";
import {
  APPWRITE_AUTH_NOT_CONFIGURED_MESSAGE,
  AuthServiceError,
  getCurrentUser,
  isAppwriteAuthConfigured,
  loginWithEmail,
  logout as logoutFromAuthService,
  type AuthUser,
} from "../services/authService";
import { getProfileByUserId, isKnownUserRole, ProfileRepositoryError } from "../services/repositories/profileRepository";
import { getRestaurantById } from "../services/repositories/restaurantRepository";

type AdminAccessIssue = "missing_profile" | "inactive_profile" | "unknown_role" | "missing_restaurant";

type AuthContextValue = {
  currentUser: AuthUser | null;
  profile: Profile | null;
  restaurant: Restaurant | null;
  role: UserRole | null;
  restaurantId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthConfigured: boolean;
  isAgencyAdmin: boolean;
  isOwner: boolean;
  isStaff: boolean;
  hasAdminAccess: boolean;
  adminAccessIssue: AdminAccessIssue | null;
  errorMessage: string | null;
  login: (email: string, password: string) => Promise<{ profile: Profile | null; user: AuthUser }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  refreshProfile: () => Promise<Profile | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof AuthServiceError || error instanceof ProfileRepositoryError) {
    return error.message;
  }

  return "تعذر التحقق من جلسة الدخول حاليًا.";
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [profileIssue, setProfileIssue] = useState<AdminAccessIssue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isAuthConfigured = isAppwriteAuthConfigured();

  const resetTenantScope = useCallback(() => {
    setProfile(null);
    setRestaurant(null);
    setProfileIssue(null);
  }, []);

  const loadProfileForUser = useCallback(
    async (user: AuthUser | null) => {
      if (!user) {
        resetTenantScope();
        return null;
      }

      try {
        const loadedProfile = await getProfileByUserId(user.$id);
        setProfile(loadedProfile);
        setProfileIssue(null);

        if (loadedProfile?.isActive && loadedProfile.restaurantId) {
          const loadedRestaurant = await getRestaurantById(loadedProfile.restaurantId);
          setRestaurant(loadedRestaurant);
        } else {
          setRestaurant(null);
        }

        return loadedProfile;
      } catch (error) {
        setProfile(null);
        setRestaurant(null);

        if (error instanceof ProfileRepositoryError && error.code === "UNKNOWN_ROLE") {
          setProfileIssue("unknown_role");
        }

        setErrorMessage(getAuthErrorMessage(error));
        return null;
      }
    },
    [resetTenantScope],
  );

  const refreshUser = useCallback(async () => {
    if (!isAuthConfigured) {
      setCurrentUser(null);
      resetTenantScope();
      setErrorMessage(APPWRITE_AUTH_NOT_CONFIGURED_MESSAGE);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);

    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setErrorMessage(null);
      await loadProfileForUser(user);
      return user;
    } catch (error) {
      setCurrentUser(null);
      resetTenantScope();
      setErrorMessage(getAuthErrorMessage(error));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthConfigured, loadProfileForUser, resetTenantScope]);

  const refreshProfile = useCallback(async () => {
    if (!currentUser) {
      resetTenantScope();
      return null;
    }

    setIsLoading(true);

    try {
      return await loadProfileForUser(currentUser);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, loadProfileForUser, resetTenantScope]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      if (!isAuthConfigured) {
        if (isMounted) {
          setCurrentUser(null);
          resetTenantScope();
          setErrorMessage(APPWRITE_AUTH_NOT_CONFIGURED_MESSAGE);
          setIsLoading(false);
        }
        return;
      }

      try {
        const user = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        setCurrentUser(user);
        setErrorMessage(null);
        await loadProfileForUser(user);
      } catch (error) {
        if (isMounted) {
          setCurrentUser(null);
          resetTenantScope();
          setErrorMessage(getAuthErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [isAuthConfigured, loadProfileForUser, resetTenantScope]);

  const login = useCallback(
    async (email: string, password: string) => {
      const user = await loginWithEmail(email, password);
      setCurrentUser(user);
      setErrorMessage(null);
      const loadedProfile = await loadProfileForUser(user);
      return { profile: loadedProfile, user };
    },
    [loadProfileForUser],
  );

  const logout = useCallback(async () => {
    try {
      await logoutFromAuthService();
      setErrorMessage(null);
    } finally {
      setCurrentUser(null);
      resetTenantScope();
    }
  }, [resetTenantScope]);

  const role = profile && isKnownUserRole(profile.role) ? profile.role : null;
  const restaurantId = profile?.restaurantId ?? null;
  const isAgencyAdmin = role === "agency_admin";
  const isOwner = role === "owner";
  const isStaff = role === "staff";
  const adminAccessIssue = useMemo<AdminAccessIssue | null>(() => {
    if (!currentUser) {
      return null;
    }

    if (profileIssue) {
      return profileIssue;
    }

    if (!profile) {
      return "missing_profile";
    }

    if (!profile.isActive) {
      return "inactive_profile";
    }

    if ((role === "owner" || role === "staff") && !profile.restaurantId) {
      return "missing_restaurant";
    }

    return null;
  }, [currentUser, profile, profileIssue, role]);
  const hasAdminAccess = Boolean(currentUser && !adminAccessIssue && (isAgencyAdmin || isOwner || isStaff));

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      profile,
      restaurant,
      role,
      restaurantId,
      isLoading,
      isAuthenticated: Boolean(currentUser),
      isAuthConfigured,
      isAgencyAdmin,
      isOwner,
      isStaff,
      hasAdminAccess,
      adminAccessIssue,
      errorMessage,
      login,
      logout,
      refreshUser,
      refreshProfile,
    }),
    [
      adminAccessIssue,
      currentUser,
      errorMessage,
      hasAdminAccess,
      isAgencyAdmin,
      isAuthConfigured,
      isLoading,
      isOwner,
      isStaff,
      login,
      logout,
      profile,
      refreshProfile,
      refreshUser,
      restaurant,
      restaurantId,
      role,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
};
