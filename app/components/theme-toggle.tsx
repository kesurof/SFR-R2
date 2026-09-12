"use client";

import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useThemeMode } from "@/app/components/theme-provider";

export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  const isDark = mode === "dark";
  return (
    <Button
      type="text"
      aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
      title="Clair / sombre"
      onClick={toggle}
      icon={isDark ? <SunOutlined /> : <MoonOutlined />}
    />
  );
}
