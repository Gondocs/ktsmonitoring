import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, login as apiLogin, setAuthToken } from "./api.ts";

type User = {
  id: number;
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!localStorage.getItem("authToken")) {
        setLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        setUser(me);
      } catch {
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setAuthToken(res.token);
    const me = await fetchMe();
    setUser(me);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login: handleLogin, logout: handleLogout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
