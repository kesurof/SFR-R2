"use client";

import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useThemeMode } from "@/app/components/theme-provider";

export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  const isDark = mode === "dark";
  return (
    <button
      className="icon-btn"
      onClick={toggle}
      aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
      title="Clair / sombre"
      suppressHydrationWarning
    >
      {isDark ? <SunOutlined /> : <MoonOutlined />}
    </button>
  );
}
