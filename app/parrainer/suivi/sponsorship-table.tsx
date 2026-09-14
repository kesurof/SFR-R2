"use client";

import { Card, Space, Table, Tag, Typography, type TableColumnsType } from "antd";
import { MobileCardList } from "@/app/components/mobile-card-list";
import { StatusBadge } from "@/app/components/status-badge";
import { useIsMobile } from "@/app/components/use-is-mobile";

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

function ReferredLabel({ row }: { row: SponsorshipRow }) {
  return (
    <>
      <strong>{row.referredName}</strong>
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
        {row.referredId}
      </Typography.Text>
    </>
  );
}

function KeyInfo({ row }: { row: SponsorshipRow }) {
  if (!row.keyStatus) return <Typography.Text type="secondary">Pas encore attribuée</Typography.Text>;
  return (
    <>
      <Tag color={row.keyStatus === "ACTIVE" ? "green" : "red"}>{row.keyStatus === "ACTIVE" ? "Disponible" : "Révoquée"}</Tag>
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
        {`Émise le ${new Date(row.keyCreatedAt as string).toLocaleDateString("fr-FR")}${
          row.keyRevokedAt ? ` · révoquée le ${new Date(row.keyRevokedAt).toLocaleDateString("fr-FR")}` : ""
        }`}
      </Typography.Text>
    </>
  );
}

export function SponsorshipTable({ rows }: { rows: SponsorshipRow[] }) {
  const isMobile = useIsMobile();

  const columns: TableColumnsType<SponsorshipRow> = [
    {
      title: "Filleul",
      key: "referred",
      render: (_, row) => <ReferredLabel row={row} />,
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
    { title: "Clé", key: "key", render: (_, row) => <KeyInfo row={row} /> },
  ];

  if (isMobile) {
    return (
      <MobileCardList
        items={rows}
        rowKey={(row) => row.id}
        emptyText="Vous n’avez encore soumis aucune demande."
        renderItem={(row) => (
          <Card size="small" style={{ width: "100%" }} title={<ReferredLabel row={row} />} extra={<StatusBadge status={row.status} />}>
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Soumise le {new Date(row.createdAt).toLocaleDateString("fr-FR")}
                {row.decidedAt ? ` · décidée le ${new Date(row.decidedAt).toLocaleDateString("fr-FR")}` : ""}
              </Typography.Text>
              <KeyInfo row={row} />
            </Space>
          </Card>
        )}
      />
    );
  }

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
