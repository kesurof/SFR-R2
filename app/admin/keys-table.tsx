"use client";

import { useMemo } from "react";
import { Button, Card, Input, Select, Space, Table, Tag, Typography, theme as antdTheme, type TableColumnsType } from "antd";
import { KeyActions } from "@/app/admin/key-actions";
import { MobileCardField } from "@/app/components/mobile-card-field";
import { MobileCardList } from "@/app/components/mobile-card-list";
import { useIsMobile } from "@/app/components/use-is-mobile";
import { usePersistentState } from "@/app/components/use-persistent-state";
import { matchesKeyFilters, type KeyTableFilters } from "@/lib/key-replacement-rules";

const DEFAULT_KEY_FILTERS: KeyTableFilters = { query: "", status: "ALL" };
const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "ACTIVE", label: "Actives" },
  { value: "REVOKED", label: "Révoquées" },
];

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

function MemberLabel({ row }: { row: KeyRow }) {
  return (
    <>
      <strong>{row.member}</strong>
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
        {row.discordId}
      </Typography.Text>
    </>
  );
}

function ReplacementSummary({ replacement, minWidth = 220 }: { replacement: KeyRow["replacementRequest"]; minWidth?: number }) {
  if (!replacement) return <Typography.Text type="secondary">—</Typography.Text>;
  const label = replacement.status === "PENDING" ? "À traiter" : replacement.status === "COMPLETED" ? "Traitée" : "Refusée";
  const color = replacement.status === "COMPLETED" ? "green" : replacement.status === "REJECTED" ? "red" : undefined;
  return (
    <Space direction="vertical" size={4} style={{ minWidth }} id={`replacement-${replacement.id}`}>
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
}

export function KeysTable({ rows }: { rows: KeyRow[] }) {
  const isMobile = useIsMobile();
  const { token } = antdTheme.useToken();
  const [filters, setFilters] = usePersistentState<KeyTableFilters>("sfr:keys-filters-v1", DEFAULT_KEY_FILTERS);
  const patch = (next: Partial<KeyTableFilters>) => setFilters((previous) => ({ ...previous, ...next }));
  const visibleRows = useMemo(() => rows.filter((row) => matchesKeyFilters(row, filters)), [rows, filters]);

  const columns: TableColumnsType<KeyRow> = [
    {
      title: "Membre",
      key: "member",
      render: (_, row) => <MemberLabel row={row} />,
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
      render: (_, row) => <ReplacementSummary replacement={row.replacementRequest} />,
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

  const filtersBar = (
    <Space wrap className="sfr-filters" style={{ marginBottom: 12 }}>
      <Input
        type="search"
        aria-label="Rechercher une clé"
        placeholder="Rechercher un membre ou un identifiant…"
        value={filters.query}
        onChange={(event) => patch({ query: event.target.value })}
        style={{ width: isMobile ? "100%" : 300 }}
      />
      <Select
        aria-label="Filtrer par statut"
        value={filters.status}
        onChange={(value) => patch({ status: value as KeyTableFilters["status"] })}
        options={STATUS_FILTER_OPTIONS}
        style={{ width: isMobile ? "100%" : 180 }}
      />
      <Button onClick={() => setFilters({ ...DEFAULT_KEY_FILTERS })} className="sfr-action">
        Réinitialiser les filtres
      </Button>
      <Typography.Text type="secondary">
        {visibleRows.length}/{rows.length}
      </Typography.Text>
    </Space>
  );

  if (isMobile) {
    return (
      <>
        {filtersBar}
        <MobileCardList
          items={visibleRows}
          rowKey={(row) => row.id}
          emptyText="Aucune clé enregistrée."
          renderItem={(row) => (
            <Card
              size="small"
              style={{
                width: "100%",
                borderInlineStart: `3px solid ${row.status === "ACTIVE" ? token.colorSuccess : token.colorError}`,
              }}
              title={
                <>
                  <strong>{row.member}</strong>
                  <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, fontWeight: 400 }}>
                    Parrainé par {row.sponsor}
                  </Typography.Text>
                </>
              }
              extra={<Tag color={row.status === "ACTIVE" ? "green" : "red"}>{row.status === "ACTIVE" ? "Active" : "Révoquée"}</Tag>}
            >
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <MobileCardField label="Empreinte">
                  <Typography.Text code>{row.fingerprint}</Typography.Text>
                </MobileCardField>
                <MobileCardField label="Émise">
                  <Typography.Text type="secondary">{new Date(row.createdAt).toLocaleDateString("fr-FR")}</Typography.Text>
                </MobileCardField>
                {row.revokedAt && (
                  <MobileCardField label="Révoquée">
                    <Typography.Text type="secondary">{new Date(row.revokedAt).toLocaleDateString("fr-FR")}</Typography.Text>
                  </MobileCardField>
                )}
                {row.replacementRequest && (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Remplacement
                    </Typography.Text>
                    <div style={{ marginTop: 4 }}>
                      <ReplacementSummary replacement={row.replacementRequest} minWidth={0} />
                    </div>
                  </div>
                )}
                <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 12 }}>
                  <KeyActions row={row} />
                </div>
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
      <Table<KeyRow>
        rowKey="id"
        columns={columns}
        dataSource={visibleRows}
        pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "Aucune clé enregistrée." }}
      />
    </>
  );
}
