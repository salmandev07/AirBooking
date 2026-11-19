import { createContext, useContext, useEffect, useState } from "react";

import api from "../api";

// Holds the logged in user and the JWT tokens for the whole app.
const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  // On a page refresh we still have a token - ask the API who we are.
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me/")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      })
      .catch(() => {
        // Token is invalid, clean up.
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function saveSession(data) {
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  }

  async function login(username, password) {
    const { data } = await api.post("/auth/login/", { username, password });
    saveSession(data);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post("/auth/register/", payload);
    return data;
  }

  function logout() {
    const refresh = localStorage.getItem("refresh_token");
    // Best effort - if the call fails we still log out locally.
    if (refresh) {
      api.post("/auth/logout/", { refresh }).catch(() => {});
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isLoggedIn: !!user,
    isAdmin: !!user?.is_superuser || !!user?.is_staff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
