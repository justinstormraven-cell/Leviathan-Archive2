import React, { createContext, useCallback, useContext, useState } from "react";
import { useGetAuthStatus, getGetAuthStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export const TOKEN_KEY = "stormraven_token";

interface AuthApi {
  token: string | null;
  operator: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );

  const login = useCallback(
    (t: string) => {
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    queryClient.invalidateQueries();
  }, [queryClient]);

  const { data: status } = useGetAuthStatus({
    query: {
      queryKey: getGetAuthStatusQueryKey(),
      enabled: !!token,
      retry: false,
    },
  });

  return (
    <AuthContext.Provider
      value={{ token, operator: status?.operator ?? null, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
