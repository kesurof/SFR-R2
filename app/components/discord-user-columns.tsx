"use client";

import { accountCreatedAt, formatAge } from "@/lib/member-age";
import {
  collectDiscordRoles,
  type DiscordUserColumnFilters,
  type DiscordUserSortKey,
  parseDiscordRoles,
  type DiscordUserTableRow,
  type SortDirection,
} from "@/lib/discord-user-columns";

type HeaderProps = {
  kind: "header";
  sortKey: DiscordUserSortKey | null;
  sortDir: SortDirection;
  onSort: (key: DiscordUserSortKey) => void;
};

type FilterProps = {
  kind: "filters";
  rows: DiscordUserTableRow[];
  filters: DiscordUserColumnFilters;
  onChange: (next: Partial<DiscordUserColumnFilters>) => void;
};

type CellsProps = {
  kind: "cells";
  user: DiscordUserTableRow;
};

export type DiscordUserColumnsProps = HeaderProps | FilterProps | CellsProps;

function SortHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: SortDirection; onClick: () => void }) {
  return (
    <button type="button" className="th-sort" aria-label={`Trier par ${label}`} onClick={onClick}>
      {label}
      <span className="th-arrow">{active ? (direction === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}

export function DiscordUserColumns(props: DiscordUserColumnsProps) {
  if (props.kind === "header") {
    return (
      <>
        <th>Pseudo serveur</th>
        <th>Nom Discord</th>
        <th>Discord ID</th>
        <th>Rôles</th>
        <th><SortHeader label="Sur le serveur" active={props.sortKey === "server"} direction={props.sortDir} onClick={() => props.onSort("server")} /></th>
        <th><SortHeader label="Compte Discord" active={props.sortKey === "account"} direction={props.sortDir} onClick={() => props.onSort("account")} /></th>
      </>
    );
  }

  if (props.kind === "filters") {
    const roles = collectDiscordRoles(props.rows);
    return (
      <>
        <th><input aria-label="Filtrer par pseudo serveur" placeholder="Filtrer…" value={props.filters.nickname} onChange={(event) => props.onChange({ nickname: event.target.value })} /></th>
        <th><input aria-label="Filtrer par nom Discord" placeholder="Filtrer…" value={props.filters.username} onChange={(event) => props.onChange({ username: event.target.value })} /></th>
        <th><input aria-label="Filtrer par Discord ID" className="mono" placeholder="Filtrer…" value={props.filters.discordId} onChange={(event) => props.onChange({ discordId: event.target.value })} /></th>
        <th>
          <select aria-label="Filtrer par rôle" value={props.filters.role} onChange={(event) => props.onChange({ role: event.target.value })}>
            <option value="">Tous les rôles</option>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            <option value="__none">Sans rôle</option>
          </select>
        </th>
        <th />
        <th />
      </>
    );
  }

  const roles = parseDiscordRoles(props.user.discordRoles);
  const joined = props.user.joinedAt ? new Date(props.user.joinedAt) : null;
  const created = accountCreatedAt(props.user.discordId);
  return (
    <>
      <td><strong>{props.user.serverNickname || "—"}</strong></td>
      <td>{props.user.username}</td>
      <td className="mono faint">{props.user.discordId}</td>
      <td>
        {roles.length ? <div className="rolechips">{roles.map((role) => <span className="rolechip" key={role}>{role}</span>)}</div> : <span className="faint">—</span>}
      </td>
      <td className="faint" title={joined?.toLocaleDateString("fr-FR")}>{formatAge(joined)}</td>
      <td className="faint" title={created?.toLocaleDateString("fr-FR")}>{formatAge(created)}</td>
    </>
  );
}
