"use client";

import { useEffect, useMemo } from "react";
import { Button, Input, Select, Space, Table, Typography, type TableColumnsType } from "antd";
import { setAccessApprover, setSponsor } from "@/app/actions";
import { buildDiscordUserColumns } from "@/app/components/discord-user-columns";
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

export function UserTable({ users }: { users: User[] }) {
  const [f, setF] = usePersistentState("sfr:admin:users-filters-v2", DEFAULT_FILTERS);
  const patch = (next: Partial<typeof f>) => setF((previous) => ({ ...previous, ...next }));
  const allRoles = useMemo(() => collectDiscordRoles(users), [users]);

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
      render: (_, user) => (
        <form action={setSponsor}>
          <input type="hidden" name="discordId" value={user.discordId} />
          <Button
            size="small"
            type={user.sponsorPermission ? "default" : "primary"}
            name="action"
            value={user.sponsorPermission ? "revoke" : "grant"}
            htmlType="submit"
          >
            {user.sponsorPermission ? "Retirer" : "Autoriser"}
          </Button>
        </form>
      ),
    },
    {
      title: "Approbation",
      key: "approval",
      sorter: (a, b) =>
        (a.accessApproverPermission ? 1 : 0) - (b.accessApproverPermission ? 1 : 0),
      render: (_, user) => (
        <form action={setAccessApprover}>
          <input type="hidden" name="discordId" value={user.discordId} />
          <Button
            size="small"
            type={user.accessApproverPermission ? "default" : "primary"}
            name="action"
            value={user.accessApproverPermission ? "revoke" : "grant"}
            htmlType="submit"
          >
            {user.accessApproverPermission ? "Retirer" : "Autoriser"}
          </Button>
        </form>
      ),
    },
  ];

  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Input
          type="search"
          aria-label="Recherche globale"
          placeholder="Recherche globale…"
          value={f.global}
          onChange={(event) => patch({ global: event.target.value })}
          style={{ width: 240 }}
        />
        <Select
          aria-label="Filtrer par rôle"
          value={f.role}
          onChange={(value) => patch({ role: value })}
          style={{ width: 180 }}
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
          style={{ width: 170 }}
          options={PERMISSION_OPTIONS}
        />
        <Select
          aria-label="Filtrer par approbation"
          placeholder="Approbation"
          allowClear
          value={f.approval || undefined}
          onChange={(value) => patch({ approval: value ?? "" })}
          style={{ width: 190 }}
          options={PERMISSION_OPTIONS}
        />
        <Button onClick={() => setF({ ...DEFAULT_FILTERS })}>Réinitialiser les filtres</Button>
        <Typography.Text type="secondary">
          {rows.length}/{users.length}
        </Typography.Text>
      </Space>
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
