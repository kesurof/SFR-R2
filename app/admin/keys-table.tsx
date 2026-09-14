"use client";

import { Button, Input, Space, Table, Tag, Typography, type TableColumnsType } from "antd";
import { replaceKeyAction, rejectKeyReplacementAction, revoke } from "@/app/actions";
import { ConfirmSubmit } from "@/app/components/confirm-submit";
import { PendingButton } from "@/app/components/pending-button";
import { RejectDialog } from "@/app/admin/reject-dialog";
import { ReplaceKeyDialog } from "@/app/admin/replace-key-dialog";

export type KeyRow = {
  id: string;
  member: string;
  discordId: string;
  fingerprint: string;
  status: string;
  revokedAt: string | null;
  createdAt: string;
  sponsor: string;
  replacementRequest: {
    id: string;
    status: string;
    createdAt: string;
    reason: string;
    decisionComment: string | null;
    previousFingerprint: string;
    isResult: boolean;
  } | null;
};

export function KeysTable({ rows }: { rows: KeyRow[] }) {
  const columns: TableColumnsType<KeyRow> = [
    {
      title: "Membre",
      key: "member",
      render: (_, row) => (
        <>
          <strong>{row.member}</strong>
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
            {row.discordId}
          </Typography.Text>
        </>
      ),
    },
    {
      title: "Parrainé par",
      key: "sponsor",
      render: (_, row) => <Typography.Text>{row.sponsor}</Typography.Text>,
    },
    { title: "Empreinte", dataIndex: "fingerprint", key: "fingerprint", render: (value: string) => <Typography.Text code>{value}</Typography.Text> },
    { title: "Émise", dataIndex: "createdAt", key: "createdAt", render: (value: string) => new Date(value).toLocaleDateString("fr-FR") },
    { title: "Révoquée", dataIndex: "revokedAt", key: "revokedAt", render: (value: string | null) => (value ? new Date(value).toLocaleDateString("fr-FR") : "—") },
    {
      title: "Remplacement",
      key: "replacement",
      render: (_, row) => {
        const replacement = row.replacementRequest;
        if (!replacement) return <Typography.Text type="secondary">—</Typography.Text>;
        const label = replacement.status === "PENDING" ? "À traiter" : replacement.status === "COMPLETED" ? "Traitée" : "Refusée";
        const color = replacement.status === "COMPLETED" ? "green" : replacement.status === "REJECTED" ? "red" : undefined;
        return (
          <Space direction="vertical" size={4} style={{ minWidth: 240 }} id={`replacement-${replacement.id}`}>
            <Space size={4}>
              <Tag color={color}>{label}</Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {new Date(replacement.createdAt).toLocaleString("fr-FR")}
              </Typography.Text>
            </Space>
            {replacement.isResult && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Remplace la clé {replacement.previousFingerprint}
              </Typography.Text>
            )}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {replacement.reason}
            </Typography.Text>
            {replacement.status === "PENDING" && !replacement.isResult && row.status === "ACTIVE" && (
              <>
                <form action={replaceKeyAction} style={{ display: "flex", gap: 4 }}>
                  <input type="hidden" name="replacementRequestId" value={replacement.id} />
                  <Input.Password name="secret" required autoComplete="off" placeholder="Nouvelle clé" size="small" style={{ width: 150 }} />
                  <PendingButton pendingLabel="Remplacement…">Remplacer la clé</PendingButton>
                </form>
                <RejectDialog
                  requestId={replacement.id}
                  action={rejectKeyReplacementAction}
                  requestIdField="replacementRequestId"
                  commentField="decisionComment"
                  title="Refuser le remplacement"
                />
              </>
            )}
            {replacement.status === "REJECTED" && replacement.decisionComment && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Refus : {replacement.decisionComment}
              </Typography.Text>
            )}
          </Space>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      fixed: "right",
      width: 200,
      render: (_, row) => {
        if (row.status === "REVOKED") {
          return (
            <Space size={4} wrap>
              <ReplaceKeyDialog keyId={row.id} />
            </Space>
          );
        }
        if (row.status !== "ACTIVE") return <Typography.Text type="secondary">—</Typography.Text>;
        const pendingReplacement = row.replacementRequest?.status === "PENDING" && !row.replacementRequest.isResult;
        return (
          <Space size={4} wrap>
            {!pendingReplacement && <ReplaceKeyDialog keyId={row.id} />}
            <form action={revoke}>
              <input type="hidden" name="keyId" value={row.id} />
              <ConfirmSubmit
                title="Révoquer cette clé ?"
                message="Le membre perdra immédiatement l'accès au stockage R2. Une nouvelle clé devra être émise."
                confirmLabel="Révoquer"
              >
                Révoquer
              </ConfirmSubmit>
            </form>
          </Space>
        );
      },
    },
  ];

  return (
    <Table<KeyRow>
      rowKey="id"
      columns={columns}
      dataSource={rows}
      pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: "Aucune clé enregistrée." }}
    />
  );
}
