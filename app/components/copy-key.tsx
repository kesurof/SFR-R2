"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { App } from "antd";
import { CheckOutlined, CloseCircleOutlined, CopyOutlined, WarningOutlined } from "@ant-design/icons";

const WINDOW_SECONDS = 15 * 60;

export function CopyKey({ token, expiresAt }: { token: string; expiresAt: string }) {
  const { notification } = App.useApp();
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
        notification.warning({ message: "Clé affichée", description: "Elle ne réapparaîtra pas. Copie-la maintenant." });
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
                {copied ? <CheckOutlined /> : <CopyOutlined />}
                {copied ? "Copié" : "Copier la clé"}
              </button>
            </div>
            <div className="warnline">
              <WarningOutlined />
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
                <CloseCircleOutlined />
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
