"use client";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/app/components/toast";

export function CreateClaimButton() {
  const [token, setToken] = useState<string>();
  const [busy, setBusy] = useState(false);
  const notify = useToast();

  async function create() {
    setBusy(true);
    try {
      const response = await fetch("/api/claims", { method: "POST" });
      const body = (await response.json()) as { token?: string; error?: string };
      if (body.token) {
        setToken(body.token);
        notify("success", "Lien prêt", "Ouvre-le pour afficher ta clé.");
      } else {
        notify(
          "error",
          "Lien indisponible",
          body.error === "Aucun accès ne vous est attribué."
            ? "Aucun accès n'a encore été préparé pour ton compte Discord."
            : body.error === "Votre clé n'est pas encore disponible."
              ? "Ta demande est acceptée, mais la clé n'a pas encore été ajoutée par l'équipe."
              : "Réessaie dans quelques instants.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (token) {
    return (
      <div className="stack" style={{ gap: "var(--s2)" }}>
        <div className="banner success" style={{ fontSize: 12.5 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <p>Ton lien personnel est prêt.</p>
        </div>
        <Link className="btn primary" href={`/claim/${token}`}>
          Afficher ma clé
        </Link>
      </div>
    );
  }

  return (
    <button className="btn primary" onClick={create} disabled={busy}>
      {busy ? "Création…" : "Créer mon lien pour récupérer ma clé"}
    </button>
  );
}
