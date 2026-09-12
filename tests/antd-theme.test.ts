import { describe, expect, it } from "vitest";
import { createAntdTheme, THEME_STORAGE_KEY } from "../app/theme/antd-theme";

describe("thème Ant Design", () => {
  it("reprend la palette claire des tokens du projet", () => {
    const theme = createAntdTheme("light");
    expect(theme.token?.colorPrimary).toBe("#5a45e0");
    expect(theme.token?.colorBgLayout).toBe("#f4f5f8");
    expect(theme.token?.colorText).toBe("#171a24");
  });

  it("reprend la palette sombre des tokens du projet", () => {
    const theme = createAntdTheme("dark");
    expect(theme.token?.colorPrimary).toBe("#8877ff");
    expect(theme.token?.colorBgLayout).toBe("#0c0e16");
    expect(theme.token?.colorText).toBe("#e8eaf2");
  });

  it("conserve la clé de persistance partagée avec le script anti-FOUC", () => {
    expect(THEME_STORAGE_KEY).toBe("sfr-theme");
  });
});
