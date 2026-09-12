"use client";
import { useState } from "react";
import { Button, Input, Modal } from "antd";
import { decide } from "@/app/actions";

type RejectAction = (data: FormData) => void | Promise<void>;

export function RejectDialog({
  requestId,
  action = decide,
  commentField = "rejectionReason",
  requestIdField = "requestId",
  title = "Refuser la demande",
}: {
  requestId: string;
  action?: RejectAction;
  commentField?: string;
  requestIdField?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button danger size="small" onClick={() => setOpen(true)}>
        Refuser
      </Button>
      <Modal title={title} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <form
          action={action}
          onSubmit={() => setOpen(false)}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input type="hidden" name={requestIdField} value={requestId} />
          <input type="hidden" name="decision" value="reject" />
          <label style={{ display: "grid", gap: 4 }}>
            <span>Motif du refus</span>
            <Input.TextArea
              name={commentField}
              required
              maxLength={500}
              rows={4}
              placeholder="Expliquez brièvement la décision…"
            />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setOpen(false)}>Annuler</Button>
            <Button danger htmlType="submit">
              Confirmer le refus
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
