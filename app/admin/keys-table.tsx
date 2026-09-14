"use client";

import { Space, Table, Tag, Typography, type TableColumnsType } from "antd";
import { KeyActions } from "@/app/admin/key-actions";

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
          <Space direction="vertical" size={4} style={{ minWidth: 220 }} id={`replacement-${replacement.id}`}>
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
      width: 170,
      render: (_, row) => <KeyActions row={row} />,
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
