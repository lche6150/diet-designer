"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuthUser,
  clearAuthSession,
  fetchCurrentUser,
  getStoredToken,
  getStoredUser,
  storeAuthSession,
} from "../lib/auth";

type AuthStatus = "loading" | "authenticated" | "guest";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  token: string | null;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const signOut = useCallback(() => {
    clearAuthSession();
    setUser(null);
    setToken(null);
    setStatus("guest");
  }, []);

  const signIn = useCallback((accessToken: string, nextUser: AuthUser) => {
    storeAuthSession(accessToken, nextUser);
    setUser(nextUser);
    setToken(accessToken);
    setStatus("authenticated");
  }, []);

  const refresh = useCallback(async () => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      signOut();
      return;
    }

    setStatus("loading");

    try {
      const currentUser = await fetchCurrentUser(storedToken);
      signIn(storedToken, currentUser);
    } catch {
      signOut();
    }
  }, [signIn, signOut]);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (!storedToken) {
      setStatus("guest");
      return;
    }

    setToken(storedToken);
    setUser(storedUser);
    setStatus(storedUser ? "authenticated" : "loading");

    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      status,
      user,
      token,
      signIn,
      signOut,
      refresh,
    }),
    [status, user, token, signIn, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
