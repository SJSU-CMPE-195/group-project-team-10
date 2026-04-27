import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContextObject";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../lib/authApi";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();

        if (!ignore) {
          setUser(currentUser);
        }
      } catch {
        if (!ignore) {
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setAuthLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      ignore = true;
    };
  }, []);

  async function login(email, password) {
    const loggedInUser = await loginUser({ email, password });
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function signup(name, email, password) {
    const registeredUser = await registerUser({ name, email, password });
    setUser(registeredUser);
    return registeredUser;
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      authLoading,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
    }),
    [user, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}