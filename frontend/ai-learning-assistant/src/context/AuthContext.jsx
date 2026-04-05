import { createContext, useEffect, useMemo, useState } from "react";
import authService from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Auth bootstrap failed:", error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    bootstrap();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      authLoading,
      async login(payload) {
        const response = await authService.login(payload);
        setUser(response.user);
        return response;
      },
      async register(payload) {
        const response = await authService.register(payload);
        setUser(response.user);
        return response;
      },
      async updatePassword(payload) {
        return authService.updatePassword(payload);
      },
      logout() {
        authService.logout();
        setUser(null);
      },
    }),
    [authLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
