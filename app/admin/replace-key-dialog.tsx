"use client";

import { useState } from "react";
import { Button, Input, Modal } from "antd";
import { replaceKeyByIdAction } from "@/app/actions";
import { ANTI_AUTOFILL_PROPS } from "@/app/components/anti-autofill";

/** Remplacement direct d'une clé (active ou révoquée) par un administrateur, depuis la vue des clés. */
export function ReplaceKeyDialog({ keyId }: { keyId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        Remplacer
      </Button>
      <Modal title="Remplacer la clé" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <form
          action={replaceKeyByIdAction}
          onSubmit={() => setOpen(false)}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input type="hidden" name="keyId" value={keyId} />
          <label style={{ display: "grid", gap: 4 }}>
            <span>Nouvelle clé</span>
            <Input.Password
              name="secret"
              required
              autoComplete="off"
              placeholder="Collez la nouvelle clé…"
              {...ANTI_AUTOFILL_PROPS}
            />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="primary" htmlType="submit">
              Remplacer la clé
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
