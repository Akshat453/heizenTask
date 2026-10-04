"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiRequest } from "@/lib/api-client";
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

  // Each login/logout/refresh starts a new generation; a response from an
  // older generation (e.g. a slow initial /auth/me 401 landing after a
  // successful login) must not overwrite the newer session state.
  const generation = useRef(0);

  const resolveMe = useCallback(async (): Promise<AuthenticatedUser | null> => {
    const current = ++generation.current;
    try {
      const me = parseUser(await apiRequest<unknown>("/auth/me", { method: "GET" }));
      if (current === generation.current) {
        setUser(me);
        setStatus("authenticated");
      }
      return me;
    } catch {
      // 401 (no or expired session) and network failures both mean "not signed in".
      if (current === generation.current) {
        setUser(null);
        setStatus("unauthenticated");
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const current = ++generation.current;
    apiRequest<unknown>("/auth/me", { method: "GET" })
      .then(parseUser)
      .then((me) => {
        if (current !== generation.current) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        if (current !== generation.current) return;
        setUser(null);
        setStatus("unauthenticated");
      });
    return () => {
      generation.current += 1; // ignore an in-flight check after unmount
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const current = ++generation.current;
    let currentUser: AuthenticatedUser;
    try {
      currentUser = parseUser(
        await apiRequest<unknown>("/auth/login", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
    } catch (error) {
      // The superseded initial check would otherwise leave status "loading".
      if (current === generation.current) {
        setUser(null);
        setStatus("unauthenticated");
      }
      throw error;
    }
    if (current === generation.current) {
      setUser(currentUser);
      setStatus("authenticated");
    }
    return currentUser;
  }, []);

  const logout = useCallback(async () => {
    generation.current += 1;
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
      refresh: resolveMe,
      can: (permission) => user?.permissions.includes(permission) ?? false,
    }),
    [login, logout, resolveMe, status, user],
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
