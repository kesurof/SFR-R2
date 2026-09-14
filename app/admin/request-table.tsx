"use client";
import { useMemo } from "react";
import { Button, Card, Input, Select, Space, Table, Typography, type TableColumnsType } from "antd";
import { archiveRequest, decide, deleteRequest, storeKey } from "@/app/actions";
import { StatusBadge } from "@/app/components/status-badge";
import { ConfirmSubmit } from "@/app/components/confirm-submit";
import { MobileCardList } from "@/app/components/mobile-card-list";
import { useIsMobile } from "@/app/components/use-is-mobile";
import { usePersistentState } from "@/app/components/use-persistent-state";
import { RequestDetails, type RequestDetailsData } from "@/app/admin/request-details";
import { RejectDialog } from "@/app/admin/reject-dialog";

const DEFAULT_FILTERS = { query: "", status: "ALL" };

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "APPROVED", label: "Acceptées" },
  { value: "KEY_READY", label: "Clé prête" },
  { value: "REJECTED", label: "Refusées" },
  { value: "KEY_REVOKED", label: "Clé révoquée" },
  { value: "ARCHIVED", label: "Archivées" },
];

type RequestRow = {
  id: string;
  status: string;
  referredName: string;
  referredId: string;
  sponsorName: string;
  relationship: string;
  knownSince: string;
  createdAt: string;
} & RequestDetailsData;

function RequestActions({ row }: { row: RequestRow }) {
  return (
    <Space size={4} wrap style={{ width: "100%" }}>
      <RequestDetails request={row} />
      {row.status === "PENDING" && (
        <>
          <form action={decide}>
            <input type="hidden" name="requestId" value={row.id} />
            <Button type="primary" size="small" htmlType="submit" name="decision" value="approve">
              Accepter
            </Button>
          </form>
          <RejectDialog requestId={row.id} />
        </>
      )}
      {row.status === "APPROVED" && (
        <form action={storeKey} style={{ display: "flex", gap: 4, width: "100%" }}>
          <input type="hidden" name="requestId" value={row.id} />
          <Input.Password
            name="secret"
            placeholder="Clé à remettre"
            required
            autoComplete="off"
            size="small"
            style={{ flex: 1, minWidth: 120 }}
          />
          <Button type="primary" size="small" htmlType="submit">
            Enregistrer
          </Button>
        </form>
      )}
      {row.status !== "ARCHIVED" && row.status !== "KEY_READY" && (
        <form action={archiveRequest}>
          <input type="hidden" name="requestId" value={row.id} />
          <Button size="small" htmlType="submit">
            Archiver
          </Button>
        </form>
      )}
      <form action={deleteRequest}>
        <input type="hidden" name="requestId" value={row.id} />
        <ConfirmSubmit
          title="Supprimer cette demande ?"
          message="La demande et son historique seront définitivement effacés."
          confirmLabel="Supprimer"
        >
          Supprimer
        </ConfirmSubmit>
      </form>
    </Space>
  );
}

export function RequestTable({ requests }: { requests: RequestRow[] }) {
  const [f, setF] = usePersistentState("sfr:admin:requests-filters-v2", DEFAULT_FILTERS);
  const patch = (p: Partial<typeof f>) => setF((prev) => ({ ...prev, ...p }));
  const isMobile = useIsMobile();

  const rows = useMemo(() => {
    const q = f.query.trim().toLocaleLowerCase();
    return requests.filter(
      (row) =>
        (f.status === "ALL" || row.status === f.status) &&
        (!q ||
          `${row.referredName} ${row.referredId} ${row.sponsorName} ${row.relationship}`
            .toLocaleLowerCase()
            .includes(q)),
    );
  }, [requests, f.query, f.status]);

  const columns: TableColumnsType<RequestRow> = [
    { title: "Statut", dataIndex: "status", key: "status", render: (status: string) => <StatusBadge status={status} /> },
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
    { title: "Parrain", dataIndex: "sponsorName", key: "sponsor" },
    {
      title: "Relation",
      key: "relationship",
      render: (_, row) => (
        <>
          {row.relationship}
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
            {row.knownSince}
          </Typography.Text>
        </>
      ),
    },
    {
      title: "Créée",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
      defaultSortOrder: "descend",
      render: (createdAt: string) => new Date(createdAt).toLocaleDateString("fr-FR"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) => <RequestActions row={row} />,
    },
  ];

  const filtersBar = (
    <Space wrap style={{ marginBottom: 12 }}>
      <Input
        type="search"
        aria-label="Rechercher une demande"
        placeholder="Rechercher un filleul, parrain ou ID…"
        value={f.query}
        onChange={(e) => patch({ query: e.target.value })}
        style={{ width: isMobile ? "100%" : 280 }}
      />
      <Select
        aria-label="Filtrer par statut"
        value={f.status}
        onChange={(value) => patch({ status: value })}
        options={STATUS_OPTIONS}
        style={{ width: isMobile ? "100%" : 180 }}
      />
      <Typography.Text type="secondary">
        {rows.length}/{requests.length}
      </Typography.Text>
    </Space>
  );

  if (isMobile) {
    return (
      <>
        {filtersBar}
        <MobileCardList
          items={rows}
          rowKey={(row) => row.id}
          emptyText="Aucune demande correspondante."
          renderItem={(row) => (
            <Card size="small" style={{ width: "100%" }} title={<strong>{row.referredName}</strong>} extra={<StatusBadge status={row.status} />}>
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {row.referredId}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Parrain : {row.sponsorName} · {row.relationship} ({row.knownSince})
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Créée le {new Date(row.createdAt).toLocaleDateString("fr-FR")}
                </Typography.Text>
                <RequestActions row={row} />
              </Space>
            </Card>
          )}
        />
      </>
    );
  }

  return (
    <>
      {filtersBar}
      <Table<RequestRow>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "Aucune demande correspondante." }}
      />
    </>
  );
}
