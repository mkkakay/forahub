"use client";

// Theme provider. The actual DOM class on <html> is applied by a tiny
// inline script in app/layout.tsx that runs before first paint, so
// dark-mode users don't see a flash of light. This provider keeps React
// state in sync with that initial class and exposes setTheme() to the
// header's theme toggle.

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "high-contrast";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "light", setTheme: () => {} });

function readInitial(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem("forahub-theme") as Theme | null;
    if (saved === "dark" || saved === "high-contrast" || saved === "light") return saved;
  } catch { /* ignore */ }
  // Fall back to current DOM class (set by the pre-paint script).
  const root = document.documentElement;
  if (root.classList.contains("high-contrast")) return "high-contrast";
  if (root.classList.contains("dark")) return "dark";
  return "light";
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "high-contrast");
  if (t === "dark") root.classList.add("dark");
  if (t === "high-contrast") root.classList.add("dark", "high-contrast");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const initial = readInitial();
    applyTheme(initial);
    setThemeState(initial);
  }, []);

  function setTheme(t: Theme) {
    applyTheme(t);
    setThemeState(t);
    try { localStorage.setItem("forahub-theme", t); } catch { /* ignore */ }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
