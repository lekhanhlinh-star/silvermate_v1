import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { setToken, clearToken, auth, users } from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name: string;
  user_type: "PARENT" | "CHILD";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => { },
  logout: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("silvermate_token");
    if (savedToken) {
      setTokenState(savedToken);
      // Fetch fresh user data from API
      users.me()
        .then((u) => {
          console.log("API /users/me response:", u);
          setUser({ id: u.id, email: u.email, full_name: u.full_name, user_type: u.user_type });
          localStorage.setItem("silvermate_user", JSON.stringify({ id: u.id, email: u.email, full_name: u.full_name, user_type: u.user_type }));
        })
        .catch(() => {
          // Token invalid, try saved user as fallback
          const savedUser = localStorage.getItem("silvermate_user");
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          } else {
            clearToken();
            localStorage.removeItem("silvermate_user");
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
    localStorage.setItem("silvermate_user", JSON.stringify(newUser));
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // ignore
    }
    clearToken();
    setTokenState(null);
    setUser(null);
    localStorage.removeItem("silvermate_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
