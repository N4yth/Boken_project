"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "boken-theme";

// Runs before hydration so the page never flashes the wrong theme
export const themeScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

type ThemeContextValue = {
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function apply(theme: ThemeChoice) {
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
      if (saved) setThemeState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    apply(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
