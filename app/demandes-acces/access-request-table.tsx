"use client";

import { useEffect, useMemo } from "react";
import { Button, Card, Input, Select, Space, Table, Tag, Typography, type TableColumnsType } from "antd";
import { decideAccessRequestAction, storeAccessRequestKey } from "@/app/actions";
import { RejectDialog } from "@/app/admin/reject-dialog";
import { buildDiscordUserColumns } from "@/app/components/discord-user-columns";
import { MobileCardList } from "@/app/components/mobile-card-list";
import { StatusBadge } from "@/app/components/status-badge";
import { useIsMobile } from "@/app/components/use-is-mobile";
import { usePersistentState } from "@/app/components/use-persistent-state";
import { AccessRequestDetails } from "@/app/demandes-acces/access-request-details";
import { matchesDiscordUserFilters, parseDiscordRoles, type DiscordUserTableRow } from "@/lib/discord-user-columns";
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

function AccessRequestActions({ row, admin }: { row: Row; admin: boolean }) {
  return (
    <Space size={4} wrap style={{ width: "100%" }}>
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
        <form action={storeAccessRequestKey} style={{ display: "flex", gap: 4, width: "100%" }}>
          <input type="hidden" name="requestId" value={row.id} />
          <Input.Password name="secret" required autoComplete="off" placeholder="Clé à remettre" size="small" style={{ flex: 1, minWidth: 120 }} />
          <Button type="primary" size="small" htmlType="submit">
            Ajouter la clé
          </Button>
        </form>
      )}
    </Space>
  );
}

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
  const isMobile = useIsMobile();

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
      render: (createdAt: string) => (
        <Typography.Text type="secondary" code>
          {new Date(createdAt).toLocaleDateString("fr-FR")}
        </Typography.Text>
      ),
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
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) => <AccessRequestActions row={row} admin={admin} />,
    },
  ];

  const filtersBar = (
    <Space wrap style={{ marginBottom: 12 }}>
      <Input
        type="search"
        aria-label="Rechercher une demande d’accès"
        placeholder="Rechercher un demandeur ou un approbateur…"
        value={filters.query}
        onChange={(event) => patch({ query: event.target.value })}
        style={{ width: isMobile ? "100%" : 300 }}
      />
      <Select
        aria-label="Filtrer par statut"
        value={filters.status}
        onChange={(value) => patch({ status: value as FilterState["status"] })}
        options={STATUS_OPTIONS}
        style={{ width: isMobile ? "100%" : 180 }}
      />
      <Button onClick={() => setFilters({ ...DEFAULT_FILTERS })} className="sfr-action">
        Réinitialiser les filtres
      </Button>
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
          renderItem={(row) => {
            const roles = parseDiscordRoles(row.discordUser.discordRoles);
            return (
              <div style={row.id === focusedRequestId ? { outline: "2px solid var(--ant-color-primary)", borderRadius: 8 } : undefined}>
                <Card
                  size="small"
                  style={{ width: "100%" }}
                  title={
                    <>
                      <strong>{row.requesterName}</strong>
                      <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                        {row.requesterId}
                      </Typography.Text>
                    </>
                  }
                  extra={<StatusBadge status={row.status} />}
                >
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    {roles.length > 0 && (
                      <Space size={4} wrap>
                        {roles.map((role) => (
                          <Tag key={role}>{role}</Tag>
                        ))}
                      </Space>
                    )}
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Soumise le {new Date(row.createdAt).toLocaleDateString("fr-FR")}
                      {row.decidedAt ? ` · décidée le ${new Date(row.decidedAt).toLocaleDateString("fr-FR")}` : ""}
                    </Typography.Text>
                    {row.approverName && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Décision : {row.approverName}
                        {row.decisionComment ? ` — ${row.decisionComment}` : ""}
                      </Typography.Text>
                    )}
                    <AccessRequestActions row={row} admin={admin} />
                  </Space>
                </Card>
              </div>
            );
          }}
        />
      </>
    );
  }

  return (
    <>
      {filtersBar}
      <Table<Row>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "Aucune demande correspondante." }}
        onRow={(row) =>
          row.id === focusedRequestId ? { style: { outline: "2px solid var(--ant-color-primary)", outlineOffset: -2 } } : {}
        }
      />
    </>
  );
}
