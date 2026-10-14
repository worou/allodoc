import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "../lib/api";
import type { User } from "../lib/types";

interface AuthState {
  user: User | null;
  ready: boolean;
  refresh: () => Promise<User | null>;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  ready: false,
  refresh: async () => null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return null;
    }
    try {
      const me = await api<User>("/api/me");
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onAuth = () => {
      if (!getToken()) setUser(null);
    };
    window.addEventListener("allodoc:auth", onAuth);
    return () => window.removeEventListener("allodoc:auth", onAuth);
  }, [refresh]);

  const login = useCallback((token: string, me: User) => {
    setToken(token);
    setUser(me);
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, ready, refresh, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Rôles implicites, comme la hiérarchie du serveur (security.yaml) : un super-administrateur administre aussi
 * chaque pays. ROLE_PRACTITIONER n'est jamais implicite ici : il signifie "a une fiche praticien" pour l'interface.
 */
const IMPLIED: Record<string, string[]> = {
  ROLE_COUNTRY_ADMIN: ["ROLE_SUPER_ADMIN"],
};

export function hasRole(user: User | null, role: string) {
  const roles = user?.roles ?? [];
  return roles.includes(role) || (IMPLIED[role] ?? []).some((r) => roles.includes(r));
}
