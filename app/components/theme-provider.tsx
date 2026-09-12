"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { App as AntdApp, ConfigProvider } from "antd";
import frFR from "antd/locale/fr_FR";
import { createAntdTheme, THEME_STORAGE_KEY, type ThemeMode } from "@/app/theme/antd-theme";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeMode() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useThemeMode doit être utilisé dans ThemeProvider");
  return value;
}

/**
 * Fournit le thème Ant Design et l'instance `App` (message, notification, modal).
 * Le script anti-FOUC du layout pose `data-theme` avant hydratation ; le mode est
 * réconcilié au montage pour rester aligné sur `localStorage`/le système.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") {
      setModeState(attr);
      return;
    }
    setModeState(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* stockage indisponible : le choix ne persistera pas */
    }
  }, []);

  const toggle = useCallback(() => setMode(mode === "dark" ? "light" : "dark"), [mode, setMode]);

  const value = useMemo(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);
  const themeConfig = useMemo(() => createAntdTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider locale={frFR} theme={themeConfig}>
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
