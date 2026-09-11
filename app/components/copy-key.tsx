"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/app/components/toast";

const WINDOW_SECONDS = 15 * 60;

export function CopyKey({ token, expiresAt }: { token: string; expiresAt: string }) {
  const notify = useToast();
  const [secret, setSecret] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );
  const copyReset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => () => clearTimeout(copyReset.current), []);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = Math.max(0, Math.min(100, Math.round((remaining / WINDOW_SECONDS) * 100)));
  const expired = remaining <= 0;

  async function reveal() {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/claim/${token}`, { method: "POST" });
      const body = (await response.json()) as { secret?: string; error?: string };
      if (body.secret) {
        setSecret(body.secret);
        notify("warning", "Clé affichée", "Elle ne réapparaîtra pas. Copie-la maintenant.");
      } else {
        setError(body.error ?? "Impossible d'afficher la clé.");
      }
    } catch {
      setError("Impossible d'afficher la clé pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
    } catch {
      /* le presse-papier peut être indisponible ; la clé reste sélectionnable */
    }
    setCopied(true);
    clearTimeout(copyReset.current);
    copyReset.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="reveal">
      <div className="vault">
        <div className="ring" style={{ "--p": pct } as React.CSSProperties}>
          <span>{expired ? "00:00" : `${mm}:${ss}`}</span>
        </div>
        <p className="faint" style={{ fontSize: 12 }}>
          Validité du lien
        </p>

        {secret ? (
          <>
            <div className="keybox">{secret}</div>
            <div className="copyrow">
              <button className="btn primary sm" onClick={copy}>
                {copied ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="12" height="12" rx="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
                  </svg>
                )}
                {copied ? "Copié" : "Copier la clé"}
              </button>
            </div>
            <div className="warnline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3 2 20h20z" />
                <path d="M12 9v5M12 17h.01" />
              </svg>
              Cette clé ne réapparaîtra pas. Colle-la maintenant dans StreamFusion Reborn.
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13, margin: "var(--s4) 0" }}>
              {expired ? "Ce lien a expiré." : "Prêt à afficher la clé d'accès R2 ?"}
            </p>
            <button className="btn primary" onClick={reveal} disabled={busy || expired}>
              {busy ? "Affichage…" : "Afficher ma clé une seule fois"}
            </button>
            {error && (
              <div className="banner danger" style={{ marginTop: "var(--s4)", fontSize: 12.5 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                <p>{error}</p>
              </div>
            )}
          </>
        )}
      </div>
      <p className="faint" style={{ fontSize: 12, textAlign: "center", marginTop: "var(--s4)" }}>
        Après affichage, ce lien devient inactif. Retour à{" "}
        <Link className="mono" style={{ color: "var(--accent)" }} href="/mon-acces">
          Mon accès
        </Link>
        .
      </p>
    </div>
  );
}
