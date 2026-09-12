"use client";

import { useEffect, useMemo } from "react";
import { Button, Input, Select, Space, Table, Typography, type TableColumnsType } from "antd";
import { decideAccessRequestAction, storeAccessRequestKey } from "@/app/actions";
import { RejectDialog } from "@/app/admin/reject-dialog";
import { buildDiscordUserColumns } from "@/app/components/discord-user-columns";
import { StatusBadge } from "@/app/components/status-badge";
import { usePersistentState } from "@/app/components/use-persistent-state";
import { AccessRequestDetails } from "@/app/demandes-acces/access-request-details";
import { matchesDiscordUserFilters, type DiscordUserTableRow } from "@/lib/discord-user-columns";
import { compareAccessRequestStatuses, type AccessRequestStatus } from "@/lib/access-request-rules";

const ACCESS_REQUEST_DISCORD_COLUMNS = ["nickname", "username", "server", "account"] as const;

type Row = {
  id: string;
  status: string;
  requesterName: string;
  requesterId: string;
  discordUser: DiscordUserTableRow;
  createdAt: string;
  decidedAt: string | null;
  approverName: string | null;
  decisionComment: string | null;
  communities: string;
  motivations: string;
  selfHosting: string;
  discovery: string | null;
};

type FilterState = {
  query: string;
  status: "ALL" | AccessRequestStatus;
};

const DEFAULT_FILTERS: FilterState = { query: "", status: "ALL" };

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "APPROVED", label: "Acceptées" },
  { value: "KEY_READY", label: "Clé prête" },
  { value: "REJECTED", label: "Refusées" },
  { value: "KEY_REVOKED", label: "Clé révoquée" },
];

export function AccessRequestTable({
  requests,
  admin,
  focusedRequestId,
  focusedRequestStatus,
  initialStatus,
}: {
  requests: Row[];
  admin: boolean;
  focusedRequestId?: string;
  focusedRequestStatus?: AccessRequestStatus;
  initialStatus?: AccessRequestStatus;
}) {
  const [filters, setFilters] = usePersistentState("sfr:access-requests-filters-v4", DEFAULT_FILTERS);
  const patch = (next: Partial<FilterState>) => setFilters((previous) => ({ ...previous, ...next }));

  useEffect(() => {
    if (focusedRequestId && focusedRequestStatus) {
      setFilters({ ...DEFAULT_FILTERS, status: focusedRequestStatus });
    } else if (initialStatus) {
      setFilters((previous) => ({ ...previous, status: initialStatus }));
    }
  }, [focusedRequestId, focusedRequestStatus, initialStatus, setFilters]);

  const rows = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase();
    return requests.filter((row) => {
      if (filters.status !== "ALL" && row.status !== filters.status) return false;
      if (!matchesDiscordUserFilters(row.discordUser, { nickname: "", username: "", discordId: "", role: "" })) return false;
      if (
        query &&
        !`${row.requesterName} ${row.requesterId} ${row.approverName ?? ""} ${row.discordUser.username} ${row.discordUser.discordRoles}`
          .toLocaleLowerCase()
          .includes(query)
      )
        return false;
      return true;
    });
  }, [requests, filters]);

  const columns: TableColumnsType<Row> = [
    {
      title: "Statut",
      dataIndex: "status",
      key: "status",
      sorter: (a, b) => compareAccessRequestStatuses(a.status, b.status, "asc"),
      render: (status: string) => <StatusBadge status={status} />,
    },
    ...buildDiscordUserColumns<Row>({
      visibleColumns: ACCESS_REQUEST_DISCORD_COLUMNS,
      getUser: (row) => row.discordUser,
    }),
    {
      title: "Soumise",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
      defaultSortOrder: "descend",
      render: (createdAt: string) => <span className="mono faint">{new Date(createdAt).toLocaleDateString("fr-FR")}</span>,
    },
    {
      title: "Décision",
      key: "decision",
      render: (_, row) =>
        row.decidedAt ? (
          <>
            <strong>{row.approverName || "Inconnu"}</strong>
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
              {new Date(row.decidedAt).toLocaleDateString("fr-FR")}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
              {row.decisionComment || "Sans commentaire"}
            </Typography.Text>
          </>
        ) : (
          <span className="faint">—</span>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) => (
        <Space size={4} wrap>
          <AccessRequestDetails
            request={{
              name: row.requesterName,
              id: row.requesterId,
              status: row.status,
              communities: row.communities,
              motivations: row.motivations,
              selfHosting: row.selfHosting,
              discovery: row.discovery,
            }}
          />
          {row.status === "PENDING" && (
            <>
              <form action={decideAccessRequestAction}>
                <input type="hidden" name="requestId" value={row.id} />
                <input type="hidden" name="decision" value="approve" />
                <Button type="primary" size="small" htmlType="submit">
                  Accepter
                </Button>
              </form>
              <RejectDialog requestId={row.id} action={decideAccessRequestAction} commentField="decisionComment" />
            </>
          )}
          {admin && row.status === "APPROVED" && (
            <form action={storeAccessRequestKey} style={{ display: "flex", gap: 4 }}>
              <input type="hidden" name="requestId" value={row.id} />
              <Input.Password name="secret" required autoComplete="off" placeholder="Clé à remettre" size="small" style={{ width: 150 }} />
              <Button type="primary" size="small" htmlType="submit">
                Ajouter la clé
              </Button>
            </form>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Input
          type="search"
          aria-label="Rechercher une demande d’accès"
          placeholder="Rechercher un demandeur ou un approbateur…"
          value={filters.query}
          onChange={(event) => patch({ query: event.target.value })}
          style={{ width: 300 }}
        />
        <Select
          aria-label="Filtrer par statut"
          value={filters.status}
          onChange={(value) => patch({ status: value as FilterState["status"] })}
          options={STATUS_OPTIONS}
          style={{ width: 180 }}
        />
        <Button onClick={() => setFilters({ ...DEFAULT_FILTERS })}>Réinitialiser les filtres</Button>
        <Typography.Text type="secondary">
          {rows.length}/{requests.length}
        </Typography.Text>
      </Space>
      <Table<Row>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "Aucune demande correspondante." }}
        onRow={(row) =>
          row.id === focusedRequestId ? { style: { outline: "2px solid var(--accent)", outlineOffset: -2 } } : {}
        }
      />
    </>
  );
}
