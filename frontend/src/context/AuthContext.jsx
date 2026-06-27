import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/axios";

const AuthContext = createContext();

const TOKEN_KEY = "aerostate_loyalty_token";
const USER_KEY = "aerostate_loyalty_user";
const OLD_TOKEN_KEY = "access_token";

const getStoredToken = () => {
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem("token") ||
    localStorage.getItem(OLD_TOKEN_KEY)
  );
};

const normalizeRole = (role) => {
  if (!role) return "Admin";

  const value = String(role)
    .trim()
    .toLowerCase()
    .replaceAll("-", "")
    .replaceAll("_", "")
    .replaceAll(" ", "");

  if (value === "superadmin") return "SuperAdmin";
  if (value === "admin") return "Admin";
  if (value === "staff") return "Staff";

  return role;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken());
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthStorage = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(OLD_TOKEN_KEY);

    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("aerostate_token");

    localStorage.removeItem("user");
    localStorage.removeItem("username");
    localStorage.removeItem("user_id");
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
  }, [clearAuthStorage]);

  const buildUserFromToken = useCallback((accessToken) => {
    const decoded = jwtDecode(accessToken);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      throw new Error("Token expired");
    }

    return {
      id: decoded.id || decoded.user_id || null,
      username: decoded.username || decoded.sub || decoded.name || "User",
      role: normalizeRole(decoded.role),
      store_id: decoded.store_id ?? null,
      is_active: decoded.is_active ?? true,
    };
  }, []);

  const saveAuth = useCallback((accessToken, userData) => {
    const finalUser = {
      id: userData?.id || userData?.user_id || null,
      username: userData?.username || "User",
      role: normalizeRole(userData?.role),
      store_id: userData?.store_id ?? null,
      is_active: userData?.is_active ?? true,
    };

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem("token", accessToken);
    localStorage.setItem(OLD_TOKEN_KEY, accessToken);

    localStorage.setItem(USER_KEY, JSON.stringify(finalUser));
    localStorage.setItem("user", JSON.stringify(finalUser));
    localStorage.setItem("username", finalUser.username);

    if (finalUser.id) {
      localStorage.setItem("user_id", String(finalUser.id));
    }

    setToken(accessToken);
    setUser(finalUser);
  }, []);

  const fetchUserProfile = useCallback(async (accessToken, fallbackUser) => {
    try {
      const response = await api.get("/users/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const profile = response.data?.user || response.data?.data || response.data;

      return {
        ...fallbackUser,
        ...profile,
        id: profile?.id || profile?.user_id || fallbackUser.id || null,
        username: profile?.username || fallbackUser.username,
        role: normalizeRole(profile?.role || fallbackUser.role),
        store_id: profile?.store_id ?? fallbackUser.store_id ?? null,
        is_active: profile?.is_active ?? fallbackUser.is_active ?? true,
      };
    } catch {
      return fallbackUser;
    }
  }, []);

  const loadUserFromToken = useCallback(
    async (accessToken) => {
      try {
        if (!accessToken) {
          setUser(null);
          setToken(null);
          return;
        }

        const tokenUser = buildUserFromToken(accessToken);
        const finalUser = await fetchUserProfile(accessToken, tokenUser);

        saveAuth(accessToken, finalUser);
      } catch (error) {
        console.error("Invalid token:", error);
        logout();
      }
    },
    [buildUserFromToken, fetchUserProfile, saveAuth, logout]
  );

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const storedToken = getStoredToken();

      if (storedToken) {
        await loadUserFromToken(storedToken);
      } else {
        setUser(null);
        setToken(null);
      }

      if (mounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [loadUserFromToken]);

  const login = async (username, password) => {
    const cleanUsername = username.trim();

    const formData = new URLSearchParams();
    formData.append("username", cleanUsername);
    formData.append("password", password);

    const response = await api.post("/token", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const accessToken = response.data?.access_token;

    if (!accessToken) {
      throw new Error("Token not received from backend");
    }

    clearAuthStorage();

    const tokenUser = response.data?.user || buildUserFromToken(accessToken);
    const finalUser = await fetchUserProfile(accessToken, tokenUser);

    saveAuth(accessToken, finalUser);

    return finalUser;
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated: Boolean(user && token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};