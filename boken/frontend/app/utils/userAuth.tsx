"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { API_URL } from "@/lib/api";
import { clearCookie, getCookie, setCookie } from "@/lib/cookies";

export { getCookie };

type AuthState = {
  isLogged: boolean;
  token: string;
  username: string;
  refresh: string;
};

type AuthContextValue = AuthState & {
  mounted: boolean;
  logout: () => void;
};

const LOGGED_OUT: AuthState = { isLogged: false, token: "", username: "", refresh: "" };

export function clearSession() {
  clearCookie("token");
  clearCookie("refresh");
  clearCookie("username");
}

export function saveSession(access: string, refresh: string, username: string) {
  setCookie("token", access, 900);
  setCookie("refresh", refresh, 86400);
  setCookie("username", username, 86400);
}

export async function refreshToken(): Promise<boolean> {
  try {
    const refresh = getCookie("refresh");
    if (!refresh) return false;

    const response = await fetch(`${API_URL}/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      clearSession();
      return false;
    }
    const data = await response.json();
    setCookie("token", data.access, 900);
    return true;
  } catch (error) {
    console.error("refresh error:", error);
    return false;
  }
}

export async function verifyToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const response = await fetch(`${API_URL}/verify_token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Token verification error:", error);
    return false;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(LOGGED_OUT);
  const [mounted, setMounted] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = getCookie("token");
    const refresh = getCookie("refresh");
    const username = getCookie("username") || "";

    let next = LOGGED_OUT;
    if (token && (await verifyToken(token))) {
      next = { isLogged: true, token, username, refresh: refresh || "" };
    } else if (refresh && (await refreshToken())) {
      const fresh = getCookie("token") || "";
      next = { isLogged: !!fresh, token: fresh, username, refresh };
    }

    setState((prev) =>
      prev.isLogged === next.isLogged && prev.token === next.token && prev.username === next.username
        ? prev
        : next
    );
    setMounted(true);
  }, []);

  useEffect(() => {
    checkAuth();
    const interval = setInterval(checkAuth, 240000);
    window.addEventListener("focus", checkAuth);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkAuth);
    };
  }, [checkAuth]);

  const logout = useCallback(() => {
    clearSession();
    setState(LOGGED_OUT);
  }, []);

  return <AuthContext.Provider value={{ ...state, mounted, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
