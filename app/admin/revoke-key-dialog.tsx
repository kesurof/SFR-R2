"use client";

import { Button, Modal, Typography } from "antd";
import { revoke } from "@/app/actions";

/** Confirmation contrôlée de la révocation d'une clé active. */
export function RevokeKeyDialog({ open, onClose, keyId }: { open: boolean; onClose: () => void; keyId: string }) {
  return (
    <Modal title="Révoquer cette clé ?" open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <form action={revoke} onSubmit={onClose} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="hidden" name="keyId" value={keyId} />
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Le membre perdra immédiatement l'accès au stockage R2. Une nouvelle clé devra être émise.
        </Typography.Paragraph>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>Annuler</Button>
          <Button danger htmlType="submit">
            Révoquer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
