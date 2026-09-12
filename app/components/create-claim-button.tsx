"use client";
import Link from "next/link";
import { useState } from "react";
import { Alert, App, Button, Space } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

export function CreateClaimButton() {
  const [token, setToken] = useState<string>();
  const [busy, setBusy] = useState(false);
  const { notification } = App.useApp();

  async function create() {
    setBusy(true);
    try {
      const response = await fetch("/api/claims", { method: "POST" });
      const body = (await response.json()) as { token?: string; error?: string };
      if (body.token) {
        setToken(body.token);
        notification.success({ message: "Lien prêt", description: "Ouvre-le pour afficher ta clé." });
      } else {
        notification.error({
          message: "Lien indisponible",
          description:
            body.error === "Aucun accès ne vous est attribué."
              ? "Aucun accès n'a encore été préparé pour ton compte Discord."
              : body.error === "Votre clé n'est pas encore disponible."
                ? "Ta demande est acceptée, mais la clé n'a pas encore été ajoutée par l'équipe."
                : "Réessaie dans quelques instants.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  if (token) {
    return (
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Alert type="success" showIcon icon={<CheckCircleOutlined />} message="Ton lien personnel est prêt." />
        <Link href={`/claim/${token}`}>
          <Button type="primary">Afficher ma clé</Button>
        </Link>
      </Space>
    );
  }

  return (
    <Button type="primary" loading={busy} onClick={create}>
      Créer mon lien pour récupérer ma clé
    </Button>
  );
}
