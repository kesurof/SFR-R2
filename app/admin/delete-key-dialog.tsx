"use client";

import { useState } from "react";
import { Button, Checkbox, Modal, Space, Typography } from "antd";
import { deleteKeyAction } from "@/app/actions";

/** Confirmation forte (case irréversible) de la suppression définitive d'une clé. */
export function DeleteKeyDialog({
  open,
  onClose,
  keyId,
  fingerprint,
  status,
}: {
  open: boolean;
  onClose: () => void;
  keyId: string;
  fingerprint: string;
  status: string;
}) {
  const [confirmed, setConfirmed] = useState(false);

  const close = () => {
    setConfirmed(false);
    onClose();
  };

  return (
    <Modal title="Supprimer définitivement cette clé ?" open={open} onCancel={close} footer={null} destroyOnHidden>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Clé <Typography.Text code>{fingerprint}</Typography.Text> — statut actuel : {status}.
        </Typography.Paragraph>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Suppression définitive et irréversible de la clé.</li>
          {status === "ACTIVE" && <li>La clé sera d'abord révoquée ; le membre perdra immédiatement l'accès.</li>}
          <li>L'historique de remplacement et les liens de récupération liés seront supprimés.</li>
        </ul>
        <Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}>
          Je comprends que cette action est irréversible.
        </Checkbox>
        <form action={deleteKeyAction} onSubmit={close} style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <input type="hidden" name="keyId" value={keyId} />
          <Button onClick={close}>Annuler</Button>
          <Button danger htmlType="submit" disabled={!confirmed}>
            Supprimer
          </Button>
        </form>
      </Space>
    </Modal>
  );
}
