"use client";

import { useState } from "react";
import { Button, Dropdown, type MenuProps } from "antd";
import { CloseCircleOutlined, DeleteOutlined, MoreOutlined, StopOutlined, SwapOutlined } from "@ant-design/icons";
import { replaceKeyAction, replaceKeyByIdAction, rejectKeyReplacementAction } from "@/app/actions";
import { DeleteKeyDialog } from "@/app/admin/delete-key-dialog";
import { ReplaceKeyDialog } from "@/app/admin/replace-key-dialog";
import { RejectDialog } from "@/app/admin/reject-dialog";
import { RevokeKeyDialog } from "@/app/admin/revoke-key-dialog";
import type { KeyRow } from "@/app/admin/keys-table";

type DialogKind = "replace" | "revoke" | "reject" | "delete" | null;

/** Action principale + menu d'actions d'une ligne de clé (administration). */
export function KeyActions({ row }: { row: KeyRow }) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const replacement = row.replacementRequest;
  const pending = replacement?.status === "PENDING" && !replacement.isResult;
  const replaceable = row.status === "ACTIVE" || row.status === "REVOKED";

  const items: MenuProps["items"] = [
    ...(row.status === "ACTIVE"
      ? [{ key: "revoke", label: "Révoquer", icon: <StopOutlined />, danger: true }]
      : []),
    ...(pending ? [{ key: "reject", label: "Refuser la demande", icon: <CloseCircleOutlined />, danger: true }] : []),
    { key: "delete", label: "Supprimer", icon: <DeleteOutlined />, danger: true },
  ];

  return (
    <>
      {replaceable && (
        <Button
          type="primary"
          size="small"
          icon={<SwapOutlined />}
          title={pending ? "Traiter la demande de remplacement" : "Remplacer la clé"}
          onClick={() => setDialog("replace")}
        >
          {pending ? "Traiter" : "Remplacer"}
        </Button>
      )}
      <Dropdown menu={{ items, onClick: ({ key }) => setDialog(key as DialogKind) }} trigger={["click"]}>
        <Button size="small" icon={<MoreOutlined />} aria-label="Plus d'actions" title="Plus d'actions" />
      </Dropdown>

      <ReplaceKeyDialog
        open={dialog === "replace"}
        onClose={() => setDialog(null)}
        action={pending ? replaceKeyAction : replaceKeyByIdAction}
        idField={pending ? "replacementRequestId" : "keyId"}
        idValue={pending && replacement ? replacement.id : row.id}
        title={pending ? "Traiter la demande de remplacement" : "Remplacer la clé"}
      />
      <RevokeKeyDialog open={dialog === "revoke"} onClose={() => setDialog(null)} keyId={row.id} />
      <RejectDialog
        hideTrigger
        open={dialog === "reject"}
        onOpenChange={(open) => setDialog(open ? "reject" : null)}
        requestId={replacement?.id ?? ""}
        action={rejectKeyReplacementAction}
        requestIdField="replacementRequestId"
        commentField="decisionComment"
        title="Refuser le remplacement"
      />
      <DeleteKeyDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        keyId={row.id}
        fingerprint={row.fingerprint}
        status={row.status}
      />
    </>
  );
}
