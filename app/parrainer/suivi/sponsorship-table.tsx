"use client";

import { Table, Tag, Typography, type TableColumnsType } from "antd";
import { StatusBadge } from "@/app/components/status-badge";

export type SponsorshipRow = {
  id: string;
  referredName: string;
  referredId: string;
  status: string;
  createdAt: string;
  decidedAt: string | null;
  keyStatus: string | null;
  keyCreatedAt: string | null;
  keyRevokedAt: string | null;
};

export function SponsorshipTable({ rows }: { rows: SponsorshipRow[] }) {
  const columns: TableColumnsType<SponsorshipRow> = [
    {
      title: "Filleul",
      key: "referred",
      render: (_, row) => (
        <>
          <strong>{row.referredName}</strong>
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
            {row.referredId}
          </Typography.Text>
        </>
      ),
    },
    { title: "Statut", dataIndex: "status", key: "status", render: (status: string) => <StatusBadge status={status} /> },
    {
      title: "Soumise",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
      defaultSortOrder: "descend",
      render: (createdAt: string) => (
        <Typography.Text type="secondary" code>
          {new Date(createdAt).toLocaleDateString("fr-FR")}
        </Typography.Text>
      ),
    },
    {
      title: "Décision",
      dataIndex: "decidedAt",
      key: "decidedAt",
      render: (decidedAt: string | null) => (
        <Typography.Text type="secondary" code>
          {decidedAt ? new Date(decidedAt).toLocaleDateString("fr-FR") : "—"}
        </Typography.Text>
      ),
    },
    {
      title: "Clé",
      key: "key",
      render: (_, row) =>
        row.keyStatus ? (
          <>
            <Tag color={row.keyStatus === "ACTIVE" ? "green" : "red"}>{row.keyStatus === "ACTIVE" ? "Disponible" : "Révoquée"}</Tag>
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
              {`Émise le ${new Date(row.keyCreatedAt as string).toLocaleDateString("fr-FR")}${
                row.keyRevokedAt ? ` · révoquée le ${new Date(row.keyRevokedAt).toLocaleDateString("fr-FR")}` : ""
              }`}
            </Typography.Text>
          </>
        ) : (
          <Typography.Text type="secondary">Pas encore attribuée</Typography.Text>
        ),
    },
  ];

  return (
    <Table<SponsorshipRow>
      rowKey="id"
      columns={columns}
      dataSource={rows}
      pagination={false}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: "Vous n’avez encore soumis aucune demande." }}
    />
  );
}
