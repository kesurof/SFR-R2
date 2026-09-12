"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Typography } from "antd";
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
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Validité du lien
        </Typography.Text>

        {secret ? (
          <>
            <div className="keybox">{secret}</div>
            <div className="copyrow">
              <Button type="primary" size="small" icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={copy}>
                {copied ? "Copié" : "Copier la clé"}
              </Button>
            </div>
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message="Cette clé ne réapparaîtra pas. Colle-la maintenant dans StreamFusion Reborn."
              style={{ marginTop: 12 }}
            />
          </>
        ) : (
          <>
            <Typography.Paragraph type="secondary" style={{ fontSize: 13, margin: "16px 0" }}>
              {expired ? "Ce lien a expiré." : "Prêt à afficher la clé d'accès R2 ?"}
            </Typography.Paragraph>
            <Button type="primary" loading={busy} disabled={expired} onClick={reveal}>
              Afficher ma clé une seule fois
            </Button>
            {error && <Alert type="error" showIcon icon={<CloseCircleOutlined />} message={error} style={{ marginTop: 16 }} />}
          </>
        )}
      </div>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, textAlign: "center", marginTop: 16 }}>
        Après affichage, ce lien devient inactif. Retour à{" "}
        <Link style={{ fontFamily: "var(--font-mono)", color: "var(--ant-color-primary)" }} href="/mon-acces">
          Mon accès
        </Link>
        .
      </Typography.Paragraph>
    </div>
  );
}
