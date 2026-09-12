import { theme, type ThemeConfig } from "antd";

/** Clé de persistance du thème, partagée avec le script anti-FOUC du layout. */
export const THEME_STORAGE_KEY = "sfr-theme";

export type ThemeMode = "light" | "dark";

/**
 * Palettes alignées sur les variables de `globals.css` : Ant Design reste la
 * source de vérité des composants, ces valeurs ne font que reprendre l'identité
 * visuelle existante.
 */
const PALETTES: Record<ThemeMode, { accent: string; info: string; success: string; warning: string; danger: string; bg: string; surface: string; raised: string; text: string; muted: string; faint: string; border: string }> = {
  light: {
    accent: "#5a45e0",
    info: "#1f5fb0",
    success: "#0f7a51",
    warning: "#95610f",
    danger: "#bf3849",
    bg: "#f4f5f8",
    surface: "#ffffff",
    raised: "#ffffff",
    text: "#171a24",
    muted: "#5a6172",
    faint: "#868d9e",
    border: "#e1e4ec",
  },
  dark: {
    accent: "#8877ff",
    info: "#6ba8f0",
    success: "#39c88c",
    warning: "#e6a94a",
    danger: "#f0798a",
    bg: "#0c0e16",
    surface: "#141824",
    raised: "#1c2130",
    text: "#e8eaf2",
    muted: "#98a0b3",
    faint: "#697386",
    border: "#262c3b",
  },
};

export function createAntdTheme(mode: ThemeMode): ThemeConfig {
  const palette = PALETTES[mode];
  return {
    algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: palette.accent,
      colorInfo: palette.info,
      colorSuccess: palette.success,
      colorWarning: palette.warning,
      colorError: palette.danger,
      colorBgLayout: palette.bg,
      colorBgContainer: palette.surface,
      colorBgElevated: palette.raised,
      colorText: palette.text,
      colorTextSecondary: palette.muted,
      colorTextTertiary: palette.faint,
      colorBorder: palette.border,
      colorBorderSecondary: palette.border,
      borderRadius: 12,
      borderRadiusLG: 18,
      borderRadiusSM: 8,
      fontFamily: "var(--font, 'IBM Plex Sans'), ui-sans-serif, system-ui, sans-serif",
    },
  };
}
