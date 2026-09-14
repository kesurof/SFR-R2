"use client";
import { useState, type ReactNode } from "react";
import { Button, Input, Modal } from "antd";
import { decide } from "@/app/actions";
import { useIsMobile } from "@/app/components/use-is-mobile";

type RejectAction = (data: FormData) => void | Promise<void>;

export function RejectDialog({
  requestId,
  action = decide,
  commentField = "rejectionReason",
  requestIdField = "requestId",
  title = "Refuser la demande",
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  triggerLabel = "Refuser",
  triggerIcon,
}: {
  requestId: string;
  action?: RejectAction;
  commentField?: string;
  requestIdField?: string;
  title?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  triggerLabel?: string;
  triggerIcon?: ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isMobile = useIsMobile();
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (value: boolean) => {
    setUncontrolledOpen(value);
    onOpenChange?.(value);
  };
  return (
    <>
      {!hideTrigger && (
        <Button danger size="small" icon={triggerIcon} onClick={() => setOpen(true)}>
          {triggerLabel}
        </Button>
      )}
      <Modal title={title} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden width={isMobile ? "calc(100vw - 24px)" : 520}>
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
