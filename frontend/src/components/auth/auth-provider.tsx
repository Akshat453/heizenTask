"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import {
  authenticatedUserSchema,
  type AuthenticatedUser,
  type LoginInput,
} from "@/lib/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  login(input: LoginInput): Promise<AuthenticatedUser>;
  logout(): Promise<void>;
  refresh(): Promise<AuthenticatedUser | null>;
  can(permission: string): boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseUser(value: unknown): AuthenticatedUser {
  return authenticatedUserSchema.parse(value);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const currentUser = parseUser(
        await apiRequest<unknown>("/auth/me", { method: "GET" }),
      );
      setUser(currentUser);
      setStatus("authenticated");
      return currentUser;
    } catch (error) {
      setUser(null);
      setStatus("unauthenticated");
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      return null;
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    apiRequest<unknown>("/auth/me", { method: "GET" })
      .then(parseUser)
      .then((currentUser) => {
        if (!isCurrent) return;
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!isCurrent) return;
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const currentUser = parseUser(
      await apiRequest<unknown>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
    setUser(currentUser);
    setStatus("authenticated");
    return currentUser;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest<{ success: true }>("/auth/logout", { method: "POST" });
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      logout,
      refresh,
      can: (permission) => user?.permissions.includes(permission) ?? false,
    }),
    [login, logout, refresh, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
