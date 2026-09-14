"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Breadcrumb, Button, Drawer, Layout, Menu, theme as antdTheme } from "antd";
import { HomeOutlined, KeyOutlined, MenuOutlined, SettingOutlined, UserAddOutlined } from "@ant-design/icons";
import { ThemeToggle } from "./theme-toggle";
import { useThemeMode } from "./theme-provider";
import { useIsMobile } from "./use-is-mobile";

export type NavItem = { href: string; label: string; icon: IconName };
type IconName = "home" | "sponsor" | "access" | "admin";

const ICONS: Record<IconName, ReactNode> = {
  home: <HomeOutlined />,
  sponsor: <UserAddOutlined />,
  access: <KeyOutlined />,
  admin: <SettingOutlined />,
};

const CRUMBS: [RegExp, string][] = [
  [/^\/$/, "Accueil"],
  [/^\/parrainer/, "Parrainer"],
  [/^\/mon-acces/, "Mon accès"],
  [/^\/demande-acces/, "Demander un accès"],
  [/^\/demandes-acces/, "Demandes d’accès"],
  [/^\/claim\//, "Récupération de clé"],
  [/^\/admin/, "Administration"],
];

const { Header, Sider, Content } = Layout;

export function AppShell({
  nav,
  account,
  signOutAction,
  children,
}: {
  nav: NavItem[];
  account: { name: string; member: boolean } | null;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { mode } = useThemeMode();
  const { token } = antdTheme.useToken();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const crumb = CRUMBS.find(([re]) => re.test(pathname))?.[1] ?? "";

  const selectedKeys = useMemo(() => {
    const matches = nav
      .filter((item) =>
        item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .map((item) => item.href)
      .sort((a, b) => b.length - a.length);
    return [matches[0] ?? "/"];
  }, [nav, pathname]);

  const menuItems = nav.map((item) => ({
    key: item.href,
    icon: ICONS[item.icon],
    label: <Link href={item.href}>{item.label}</Link>,
  }));

  const brand = (showText: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, minHeight: 64 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          display: "grid",
          placeItems: "center",
          background: token.colorPrimary,
          color: token.colorTextLightSolid,
          fontWeight: 700,
          flex: "none",
        }}
      >
        S
      </div>
      {showText && (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700 }}>StreamFusion Reborn</div>
          <div style={{ fontSize: 12, color: token.colorTextTertiary }}>Accès R2 privé</div>
        </div>
      )}
    </div>
  );

  const navigation = (
    <Menu
      theme={mode}
      mode="inline"
      selectedKeys={selectedKeys}
      items={menuItems}
      style={{ borderInlineEnd: "none" }}
      onClick={() => setDrawerOpen(false)}
    />
  );

  const accountBlock = account ? (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: 16,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <span style={{ color: token.colorTextSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {account.name}
      </span>
      <form action={signOutAction}>
        <Button type="link" htmlType="submit" style={{ padding: 0 }}>
          Déconnexion
        </Button>
      </form>
    </div>
  ) : null;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!isMobile && (
        <Sider
          collapsedWidth={64}
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          trigger={null}
          theme={mode}
          width={248}
          style={{ borderInlineEnd: `1px solid ${token.colorBorderSecondary}` }}
        >
          {brand(!collapsed)}
          {navigation}
        </Sider>
      )}

      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: isMobile ? "0 12px" : "0 16px",
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Button
            type="text"
            icon={<MenuOutlined />}
            aria-label="Ouvrir la navigation"
            aria-expanded={isMobile ? drawerOpen : !collapsed}
            onClick={() => (isMobile ? setDrawerOpen((value) => !value) : setCollapsed((value) => !value))}
          />
          {isMobile ? (
            <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              StreamFusion Reborn
            </span>
          ) : (
            <Breadcrumb
              items={[
                { title: <Link href="/">Accueil</Link> },
                ...(crumb && crumb !== "Accueil" ? [{ title: crumb }] : []),
              ]}
            />
          )}
          <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            {account && !isMobile ? (
              <>
                <span style={{ color: token.colorTextSecondary }}>{account.name}</span>
                <form action={signOutAction}>
                  <Button type="link" htmlType="submit">
                    Déconnexion
                  </Button>
                </form>
              </>
            ) : null}
          </div>
        </Header>
        <Content style={{ padding: isMobile ? 12 : 24 }}>{children}</Content>
      </Layout>

      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={280}
          closable={false}
          styles={{ body: { padding: 0, display: "flex", flexDirection: "column" } }}
        >
          {brand(true)}
          <div style={{ flex: 1, overflowY: "auto" }}>{navigation}</div>
          {accountBlock}
        </Drawer>
      )}
    </Layout>
  );
}
