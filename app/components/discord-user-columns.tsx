"use client";

import React from "react";
import { accountCreatedAt, formatAge } from "@/lib/member-age";
import {
  collectDiscordRoles,
  type DiscordUserColumnFilters,
  type DiscordUserSortKey,
  parseDiscordRoles,
  type DiscordUserTableRow,
  type SortDirection,
} from "@/lib/discord-user-columns";

export type DiscordUserColumn = "nickname" | "username" | "discordId" | "roles" | "server" | "account";
export const ALL_DISCORD_USER_COLUMNS: readonly DiscordUserColumn[] = ["nickname", "username", "discordId", "roles", "server", "account"];

type HeaderProps = {
  kind: "header";
  sortKey: DiscordUserSortKey | null;
  sortDir: SortDirection;
  onSort: (key: DiscordUserSortKey) => void;
  visibleColumns?: readonly DiscordUserColumn[];
};

type FilterProps = {
  kind: "filters";
  rows: DiscordUserTableRow[];
  filters: DiscordUserColumnFilters;
  onChange: (next: Partial<DiscordUserColumnFilters>) => void;
  visibleColumns?: readonly DiscordUserColumn[];
};

type CellsProps = {
  kind: "cells";
  user: DiscordUserTableRow;
  visibleColumns?: readonly DiscordUserColumn[];
};

export type DiscordUserColumnsProps = HeaderProps | FilterProps | CellsProps;

export function SortHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: SortDirection; onClick: () => void }) {
  return (
    <button type="button" className="th-sort" aria-label={`Trier par ${label}`} onClick={onClick}>
      {label}
      <span className="th-arrow">{active ? (direction === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}

export function DiscordUserColumns(props: DiscordUserColumnsProps) {
  const visibleColumns = props.visibleColumns ?? ALL_DISCORD_USER_COLUMNS;
  const show = (column: DiscordUserColumn) => visibleColumns.includes(column);

  if (props.kind === "header") {
    return (
      <>
        {show("nickname") && <th>Pseudo serveur</th>}
        {show("username") && <th>Nom Discord</th>}
        {show("discordId") && <th>Discord ID</th>}
        {show("roles") && <th>Rôles</th>}
        {show("server") && <th><SortHeader label="Sur le serveur" active={props.sortKey === "server"} direction={props.sortDir} onClick={() => props.onSort("server")} /></th>}
        {show("account") && <th><SortHeader label="Compte Discord" active={props.sortKey === "account"} direction={props.sortDir} onClick={() => props.onSort("account")} /></th>}
      </>
    );
  }

  if (props.kind === "filters") {
    const roles = collectDiscordRoles(props.rows);
    return (
      <>
        {show("nickname") && <th><input aria-label="Filtrer par pseudo serveur" placeholder="Filtrer…" value={props.filters.nickname} onChange={(event) => props.onChange({ nickname: event.target.value })} /></th>}
        {show("username") && <th><input aria-label="Filtrer par nom Discord" placeholder="Filtrer…" value={props.filters.username} onChange={(event) => props.onChange({ username: event.target.value })} /></th>}
        {show("discordId") && <th><input aria-label="Filtrer par Discord ID" className="mono" placeholder="Filtrer…" value={props.filters.discordId} onChange={(event) => props.onChange({ discordId: event.target.value })} /></th>}
        {show("roles") && <th>
          <select aria-label="Filtrer par rôle" value={props.filters.role} onChange={(event) => props.onChange({ role: event.target.value })}>
            <option value="">Tous les rôles</option>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            <option value="__none">Sans rôle</option>
          </select>
        </th>}
        {show("server") && <th />}
        {show("account") && <th />}
      </>
    );
  }

  const roles = parseDiscordRoles(props.user.discordRoles);
  const joined = props.user.joinedAt ? new Date(props.user.joinedAt) : null;
  const created = accountCreatedAt(props.user.discordId);
  return (
    <>
      {show("nickname") && <td><strong>{props.user.serverNickname || "—"}</strong></td>}
      {show("username") && <td>{props.user.username}</td>}
      {show("discordId") && <td className="mono faint">{props.user.discordId}</td>}
      {show("roles") && <td>
        {roles.length ? <div className="rolechips">{roles.map((role) => <span className="rolechip" key={role}>{role}</span>)}</div> : <span className="faint">—</span>}
      </td>}
      {show("server") && <td className="faint" title={joined?.toLocaleDateString("fr-FR")}>{formatAge(joined)}</td>}
      {show("account") && <td className="faint" title={created?.toLocaleDateString("fr-FR")}>{formatAge(created)}</td>}
    </>
  );
}
