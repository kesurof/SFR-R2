"use client";

import { Space, Tag, Typography, type TableColumnsType } from "antd";
import { accountCreatedAt, formatAge } from "@/lib/member-age";
import { compareDiscordUsers, parseDiscordRoles, type DiscordUserTableRow } from "@/lib/discord-user-columns";

export type DiscordUserColumn = "nickname" | "username" | "discordId" | "roles" | "server" | "account";
export const ALL_DISCORD_USER_COLUMNS: readonly DiscordUserColumn[] = ["nickname", "username", "discordId", "roles", "server", "account"];

/**
 * Colonnes Ant Design partagées pour l'identité Discord. Le tri est assuré par
 * `compareDiscordUsers` ; les filtres restent gérés par les barres d'outils des
 * tables (source de vérité `lib/discord-user-columns`).
 *
 * `getUser` permet aux lignes qui imbriquent l'utilisateur Discord (demandes
 * d'accès) de réutiliser les mêmes colonnes.
 */
export function buildDiscordUserColumns<RowT extends object>({
  visibleColumns = ALL_DISCORD_USER_COLUMNS,
  getUser = (row) => row as unknown as DiscordUserTableRow,
}: {
  visibleColumns?: readonly DiscordUserColumn[];
  getUser?: (row: RowT) => DiscordUserTableRow;
} = {}): TableColumnsType<RowT> {
  const show = (column: DiscordUserColumn) => visibleColumns.includes(column);
  const columns: TableColumnsType<RowT> = [];

  if (show("nickname")) {
    columns.push({
      title: "Pseudo serveur",
      key: "nickname",
      render: (_, row) => <strong>{getUser(row).serverNickname || "—"}</strong>,
    });
  }
  if (show("username")) {
    columns.push({ title: "Nom Discord", key: "username", render: (_, row) => getUser(row).username });
  }
  if (show("discordId")) {
    columns.push({
      title: "Discord ID",
      key: "discordId",
      render: (_, row) => (
        <Typography.Text type="secondary" code>
          {getUser(row).discordId}
        </Typography.Text>
      ),
    });
  }
  if (show("roles")) {
    columns.push({
      title: "Rôles",
      key: "roles",
      render: (_, row) => {
        const roles = parseDiscordRoles(getUser(row).discordRoles);
        return roles.length ? (
          <Space size={4} wrap>
            {roles.map((role) => (
              <Tag key={role}>{role}</Tag>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        );
      },
    });
  }
  if (show("server")) {
    columns.push({
      title: "Sur le serveur",
      key: "server",
      sorter: (a, b) => compareDiscordUsers(getUser(a), getUser(b), "server", "asc"),
      render: (_, row) => {
        const joinedAt = getUser(row).joinedAt;
        const joined = joinedAt ? new Date(joinedAt) : null;
        return (
          <span title={joined?.toLocaleDateString("fr-FR")}>
            <Typography.Text type="secondary">{formatAge(joined)}</Typography.Text>
          </span>
        );
      },
    });
  }
  if (show("account")) {
    columns.push({
      title: "Compte Discord",
      key: "account",
      sorter: (a, b) => compareDiscordUsers(getUser(a), getUser(b), "account", "asc"),
      render: (_, row) => {
        const created = accountCreatedAt(getUser(row).discordId);
        return (
          <span title={created?.toLocaleDateString("fr-FR")}>
            <Typography.Text type="secondary">{formatAge(created)}</Typography.Text>
          </span>
        );
      },
    });
  }

  return columns;
}
