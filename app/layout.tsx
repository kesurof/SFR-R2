import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import localFont from "next/font/local";
import { auth, signOut } from "@/auth";
import { isAccessApprover, isAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { isDiscordMember } from "@/lib/membership";
import { AppShell, type NavItem } from "@/app/components/app-shell";
import { FlashToasts } from "@/app/components/flash-toasts";
import { ToastProvider } from "@/app/components/toast";
import "./globals.css";

const sans = localFont({
  src: [{ path: "./fonts/ibm-plex-sans-latin.woff2", weight: "400 600", style: "normal" }],
  variable: "--font-sans",
  display: "swap",
});
const mono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});
const display = localFont({
  src: [{ path: "./fonts/chivo-latin.woff2", weight: "400 900", style: "normal" }],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StreamFusion Reborn — Accès privé",
  description: "Portail privé de parrainage et de récupération de clé R2.",
};

const THEME_INIT = `(function(){try{var t=localStorage.getItem('sfr-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const discordId = session?.user?.discordId;
  const admin = discordId ? isAdmin(discordId) : false;
  const isMember = !!discordId && (admin || (await isDiscordMember(discordId)));

  let canSponsor = admin;
  if (discordId && isMember && !admin) {
    canSponsor = !!(await prisma.sponsorPermission.findFirst({ where: { user: { discordId } } }));
  }

  const nav: NavItem[] = [{ href: "/", label: "Accueil", icon: "home" }];
  if (isMember && canSponsor) { nav.push({ href: "/parrainer", label: "Parrainer", icon: "sponsor" }); nav.push({ href: "/parrainer/suivi", label: "Mes parrainages", icon: "sponsor" }); }
  if (isMember) nav.push({ href: "/mon-acces", label: "Mon accès", icon: "access" });
  if (isMember) nav.push({ href: "/demande-acces", label: "Demander un accès", icon: "access" });
  if (discordId && (await isAccessApprover(discordId))) nav.push({ href: "/demandes-acces", label: "Demandes d’accès", icon: "admin" });
  if (admin) nav.push({ href: "/admin", label: "Administration", icon: "admin" });

  const account = session?.user ? { name: session.user.username, member: isMember } : null;

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="fr" className={`${sans.variable} ${mono.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <ToastProvider>
          <AppShell nav={nav} account={account} signOutAction={doSignOut}>
            {children}
          </AppShell>
          <Suspense fallback={null}>
            <FlashToasts />
          </Suspense>
        </ToastProvider>
      </body>
    </html>
  );
}
