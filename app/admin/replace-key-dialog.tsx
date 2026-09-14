"use client";

import { Button, Input, Modal } from "antd";
import { replaceKeyByIdAction } from "@/app/actions";
import { ANTI_AUTOFILL_PROPS } from "@/app/components/anti-autofill";

type ReplaceAction = (data: FormData) => void | Promise<void>;

/**
 * Modale de remplacement d'une clé. Contrôlée par le parent : elle sert aussi bien
 * au remplacement direct (`keyId`) qu'au traitement d'une demande membre
 * (`replacementRequestId`), selon `idField`/`action`.
 */
export function ReplaceKeyDialog({
  open,
  onClose,
  idValue,
  action = replaceKeyByIdAction,
  idField = "keyId",
  title = "Remplacer la clé",
  confirmLabel = "Remplacer la clé",
  placeholder = "Collez la nouvelle clé…",
}: {
  open: boolean;
  onClose: () => void;
  idValue: string;
  action?: ReplaceAction;
  idField?: string;
  title?: string;
  confirmLabel?: string;
  placeholder?: string;
}) {
  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <form action={action} onSubmit={onClose} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="hidden" name={idField} value={idValue} />
        <label style={{ display: "grid", gap: 4 }}>
          <span>Nouvelle clé</span>
          <Input.Password
            name="secret"
            required
            autoComplete="off"
            placeholder={placeholder}
            {...ANTI_AUTOFILL_PROPS}
          />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="primary" htmlType="submit">
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
