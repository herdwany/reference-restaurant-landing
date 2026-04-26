import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  APPWRITE_AUTH_NOT_CONFIGURED_MESSAGE,
  AuthServiceError,
  getCurrentUser,
  isAppwriteAuthConfigured,
  loginWithEmail,
  logout as logoutFromAuthService,
  type AuthUser,
} from "../services/authService";

type FutureUserRole = "agency_admin" | "owner" | "staff";

type AuthContextValue = {
  currentUser: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthConfigured: boolean;
  errorMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof AuthServiceError) {
    return error.message;
  }

  return "تعذر التحقق من جلسة الدخول حاليًا.";
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isAuthConfigured = isAppwriteAuthConfigured();

  // Phase later: load profile and role from profiles collection.
  // Prepared roles: agency_admin, owner, staff.
  const _futureRole: FutureUserRole | null = null;
  void _futureRole;

  const refreshUser = useCallback(async () => {
    if (!isAuthConfigured) {
      setCurrentUser(null);
      setErrorMessage(APPWRITE_AUTH_NOT_CONFIGURED_MESSAGE);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);

    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setErrorMessage(null);
      return user;
    } catch (error) {
      setCurrentUser(null);
      setErrorMessage(getAuthErrorMessage(error));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthConfigured]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      if (!isAuthConfigured) {
        if (isMounted) {
          setCurrentUser(null);
          setErrorMessage(APPWRITE_AUTH_NOT_CONFIGURED_MESSAGE);
          setIsLoading(false);
        }
        return;
      }

      try {
        const user = await getCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setCurrentUser(null);
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
  }, [isAuthConfigured]);

  const login = useCallback(
    async (email: string, password: string) => {
      const user = await loginWithEmail(email, password);
      setCurrentUser(user);
      setErrorMessage(null);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await logoutFromAuthService();
      setErrorMessage(null);
    } finally {
      setCurrentUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isLoading,
      isAuthenticated: Boolean(currentUser),
      isAuthConfigured,
      errorMessage,
      login,
      logout,
      refreshUser,
    }),
    [currentUser, errorMessage, isAuthConfigured, isLoading, login, logout, refreshUser],
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
