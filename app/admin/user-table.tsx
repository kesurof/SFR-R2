"use client";

import { useEffect, useMemo } from "react";
import { Avatar, Button, Card, Input, Select, Space, Table, Tag, Typography, theme as antdTheme, type TableColumnsType } from "antd";
import { setAccessApprover, setSponsor } from "@/app/actions";
import { buildDiscordUserColumns } from "@/app/components/discord-user-columns";
import { MobileCardField } from "@/app/components/mobile-card-field";
import { MobileCardList } from "@/app/components/mobile-card-list";
import { useIsMobile } from "@/app/components/use-is-mobile";
import { usePersistentState } from "@/app/components/use-persistent-state";
import {
  collectDiscordRoles,
  matchesDiscordUserFilters,
  parseDiscordRoles,
  type DiscordUserTableRow,
} from "@/lib/discord-user-columns";

type User = DiscordUserTableRow & {
  id: string;
  sponsorPermission: { id: string } | null;
  accessApproverPermission: { id: string } | null;
};

const DEFAULT_FILTERS = { global: "", role: "", sponsor: "", approval: "" };

const PERMISSION_OPTIONS = [
  { value: "yes", label: "Autorisé" },
  { value: "no", label: "Non autorisé" },
];

function PermissionForm({
  discordId,
  action,
  granted,
}: {
  discordId: string;
  action: (data: FormData) => void | Promise<void>;
  granted: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="discordId" value={discordId} />
      <Button size="small" type={granted ? "default" : "primary"} name="action" value={granted ? "revoke" : "grant"} htmlType="submit">
        {granted ? "Retirer" : "Autoriser"}
      </Button>
    </form>
  );
}

export function UserTable({ users }: { users: User[] }) {
  const [f, setF] = usePersistentState("sfr:admin:users-filters-v2", DEFAULT_FILTERS);
  const patch = (next: Partial<typeof f>) => setF((previous) => ({ ...previous, ...next }));
  const allRoles = useMemo(() => collectDiscordRoles(users), [users]);
  const isMobile = useIsMobile();
  const { token } = antdTheme.useToken();

  useEffect(() => {
    if (f.role && f.role !== "__none" && !allRoles.includes(f.role)) patch({ role: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRoles, f.role]);

  const rows = useMemo(() => {
    const global = f.global.trim().toLocaleLowerCase();
    return users.filter((user) => {
      if (!matchesDiscordUserFilters(user, { nickname: "", username: "", discordId: "", role: f.role })) return false;
      if (f.sponsor === "yes" && !user.sponsorPermission) return false;
      if (f.sponsor === "no" && user.sponsorPermission) return false;
      if (f.approval === "yes" && !user.accessApproverPermission) return false;
      if (f.approval === "no" && user.accessApproverPermission) return false;
      if (global) {
        const haystack = `${user.serverNickname ?? ""} ${user.username} ${user.discordId} ${parseDiscordRoles(user.discordRoles).join(" ")}`.toLocaleLowerCase();
        if (!haystack.includes(global)) return false;
      }
      return true;
    });
  }, [users, f.global, f.sponsor, f.approval, f.role]);

  const columns: TableColumnsType<User> = [
    ...buildDiscordUserColumns<User>(),
    {
      title: "Parrainage",
      key: "sponsor",
      render: (_, user) => <PermissionForm discordId={user.discordId} action={setSponsor} granted={!!user.sponsorPermission} />,
    },
    {
      title: "Approbation",
      key: "approval",
      sorter: (a, b) =>
        (a.accessApproverPermission ? 1 : 0) - (b.accessApproverPermission ? 1 : 0),
      render: (_, user) => <PermissionForm discordId={user.discordId} action={setAccessApprover} granted={!!user.accessApproverPermission} />,
    },
  ];

  const filtersBar = (
    <Space wrap className="sfr-filters" style={{ marginBottom: 12 }}>
      <Input
        type="search"
        aria-label="Recherche globale"
        placeholder="Recherche globale…"
        value={f.global}
        onChange={(event) => patch({ global: event.target.value })}
        style={{ width: isMobile ? "100%" : 240 }}
      />
      <Select
        aria-label="Filtrer par rôle"
        value={f.role}
        onChange={(value) => patch({ role: value })}
        style={{ width: isMobile ? "100%" : 180 }}
        options={[
          { value: "", label: "Tous les rôles" },
          ...allRoles.map((role) => ({ value: role, label: role })),
          { value: "__none", label: "Sans rôle" },
        ]}
      />
      <Select
        aria-label="Filtrer par parrainage"
        placeholder="Parrainage"
        allowClear
        value={f.sponsor || undefined}
        onChange={(value) => patch({ sponsor: value ?? "" })}
        style={{ width: isMobile ? "100%" : 170 }}
        options={PERMISSION_OPTIONS}
      />
      <Select
        aria-label="Filtrer par approbation"
        placeholder="Approbation"
        allowClear
        value={f.approval || undefined}
        onChange={(value) => patch({ approval: value ?? "" })}
        style={{ width: isMobile ? "100%" : 190 }}
        options={PERMISSION_OPTIONS}
      />
      <Button onClick={() => setF({ ...DEFAULT_FILTERS })} className="sfr-action">
        Réinitialiser les filtres
      </Button>
      <Typography.Text type="secondary">
        {rows.length}/{users.length}
      </Typography.Text>
    </Space>
  );

  if (isMobile) {
    return (
      <>
        {filtersBar}
        <MobileCardList
          items={rows}
          rowKey={(user) => user.id}
          emptyText="Aucun utilisateur ne correspond aux filtres."
          renderItem={(user) => {
            const roles = parseDiscordRoles(user.discordRoles);
            const displayName = user.serverNickname || user.username;
            return (
              <Card
                size="small"
                style={{ width: "100%" }}
                title={
                  <Space size={8}>
                    <Avatar size={28} style={{ background: token.colorPrimary }}>
                      {displayName.charAt(0).toLocaleUpperCase()}
                    </Avatar>
                    <strong>{displayName}</strong>
                  </Space>
                }
                extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>{user.username}</Typography.Text>}
              >
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <MobileCardField label="Discord ID">
                    <Typography.Text code>{user.discordId}</Typography.Text>
                  </MobileCardField>
                  <MobileCardField label="Rôles" align="left">
                    {roles.length ? (
                      <Space size={4} wrap>
                        {roles.map((role) => (
                          <Tag key={role}>{role}</Tag>
                        ))}
                      </Space>
                    ) : (
                      <Typography.Text type="secondary">—</Typography.Text>
                    )}
                  </MobileCardField>
                  <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 12 }}>
                    <Space direction="vertical" size={10} style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <Space size={6}>
                          <Typography.Text>Parrainage</Typography.Text>
                          <Tag color={user.sponsorPermission ? "green" : "default"}>{user.sponsorPermission ? "Autorisé" : "Non autorisé"}</Tag>
                        </Space>
                        <PermissionForm discordId={user.discordId} action={setSponsor} granted={!!user.sponsorPermission} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <Space size={6}>
                          <Typography.Text>Approbation</Typography.Text>
                          <Tag color={user.accessApproverPermission ? "green" : "default"}>{user.accessApproverPermission ? "Autorisé" : "Non autorisé"}</Tag>
                        </Space>
                        <PermissionForm discordId={user.discordId} action={setAccessApprover} granted={!!user.accessApproverPermission} />
                      </div>
                    </Space>
                  </div>
                </Space>
              </Card>
            );
          }}
        />
      </>
    );
  }

  return (
    <>
      {filtersBar}
      <Table<User>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "Aucun utilisateur ne correspond aux filtres." }}
      />
    </>
  );
}
