"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, getToken, setToken, UNAUTHORIZED_EVENT } from "./api";
import type { AuthResponse, User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  setBalance: (balance: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/auth/me", { auth: true })
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const handleAuth = useCallback((res: AuthResponse) => {
    setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      handleAuth(await api.post<AuthResponse>("/auth/login", { email, password }));
    },
    [handleAuth],
  );

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      handleAuth(await api.post<AuthResponse>("/auth/register", { email, username, password }));
    },
    [handleAuth],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const setBalance = useCallback((balance: string) => {
    setUser((u) => (u ? { ...u, balance } : u));
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, setBalance }),
    [user, loading, login, register, logout, setBalance],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
