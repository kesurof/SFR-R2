"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

export type NavItem = { href: string; label: string; icon: IconName };
type IconName = "home" | "sponsor" | "access" | "admin";

const ICONS: Record<IconName, ReactNode> = {
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  sponsor: <path d="M16 11a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0M19 8h4M21 6v4" />,
  access: <path d="M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM11 11l-7 7v3h3l1-1v-2h2v-2h2z" />,
  admin: <path d="M9 11l3 3 8-8M4 12v7a1 1 0 0 0 1 1h14" />,
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
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const crumb = CRUMBS.find(([re]) => re.test(pathname))?.[1] ?? "";
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="app">
      {open && <div className="rail-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`rail${open ? " open" : ""}`}>
        <div className="rail-brand">
          <div className="mark">S</div>
          <div>
            <b>StreamFusion Reborn</b>
            <span>Accès R2 privé</span>
          </div>
        </div>
        <div className="rail-group">Navigation</div>
        <nav aria-label="Navigation principale" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-item"
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                {ICONS[item.icon]}
              </svg>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="rail-foot">
          <div className="rail-group" style={{ paddingTop: 0 }}>
            Accès
          </div>
          <div className="ecosystem" style={{ margin: 0, padding: "0 8px" }}>
            <span className="chip">
              <span className="dot" style={{ background: "#5865F2" }} />
              Discord
            </span>
            <span className="chip">
              <span className="dot" style={{ background: "var(--accent)" }} />
              Stockage R2
            </span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-btn menu-toggle"
              aria-label="Ouvrir la navigation"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="crumb">{crumb}</span>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            {account ? (
              <div className="account">
                <span className="avatar" />
                <span className="who">{account.name}</span>
                <form action={signOutAction}>
                  <button className="link" type="submit">
                    Déconnexion
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </header>
        <main className="canvas">{children}</main>
      </div>
    </div>
  );
}
