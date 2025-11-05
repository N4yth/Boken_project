"use client";
import { useEffect, useState } from "react";


type AuthState = {
  isLogged: boolean;
  token: string;
  username: string;
  refresh: string;
};


export function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const cookies: Record<string, string> = {};
  document.cookie.split('; ').forEach(cookie => {
    const [key, value] = cookie.split('=');
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  });
  return cookies[name];
}


export async function refreshToken(): Promise<boolean> {
  try {
    const refresh = getCookie('refresh');
    if (!refresh) {
      return false;
    }
    const response = await fetch("http://127.0.0.1:8000/refresh/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "refresh=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      return false;
    }
    const data = await response.json();
    document.cookie = `token=${data.access}; path=/; max-age=900; sameSite=strict;`;
    return true;
  } catch (error) {
    console.error("refresh error:", error);
    return false;
  }
};

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("http://127.0.0.1:8000/verify_token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    return response.ok;
  } catch (error) {
    console.log("Token verification error:", error);
    return false;
  }
};

export function useAuth(): AuthState & { mounted: boolean } {
  const [authState, setAuthState] = useState<AuthState>({
    isLogged: false,
    username: "",
    token: "",
    refresh: ""
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getCookie('token');
      const username = getCookie('username');
      const refresh = getCookie('refresh');
      if (token && token !== "" && token !== "undefined") {
        const isValid = await verifyToken(token);

        if (isValid) {
          setAuthState({
            isLogged: true,
            username: username || "",
            token: token,
            refresh: refresh || ""
          });
        } else if (refresh) {
          const refreshed = await refreshToken();
          const newToken = getCookie('token');

          setAuthState({
            isLogged: refreshed && !!newToken,
            username: refreshed ? (username || "") : "",
            token: refreshed ? (newToken || "") : "",
            refresh: refreshed ? (refresh || "") : ""
          });
        } else {
          setAuthState({
            isLogged: false,
            username: "",
            token: "",
            refresh: ""
          });
        }
      } else {
        setAuthState({
          isLogged: false,
          username: "",
          token: "",
          refresh: ""
        });
      }

      setMounted(true);
    };
    checkAuth();
    const interval = setInterval(checkAuth, 300000);
    window.addEventListener('focus', checkAuth);
    return () => {
      window.removeEventListener('focus', checkAuth);
      clearInterval(interval);
    };
  }, []);

  return { ...authState, mounted };
}
