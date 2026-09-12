"use client";

import { useEffect, useMemo } from "react";
import { decideAccessRequestAction, storeAccessRequestKey } from "@/app/actions";
import { RejectDialog } from "@/app/admin/reject-dialog";
import { DiscordUserColumns } from "@/app/components/discord-user-columns";
import { StatusBadge } from "@/app/components/status-badge";
import { usePersistentState } from "@/app/components/use-persistent-state";
import { AccessRequestDetails } from "@/app/demandes-acces/access-request-details";
import { compareDiscordUsers, DEFAULT_DISCORD_USER_FILTERS, matchesDiscordUserFilters, type DiscordUserColumnFilters, type DiscordUserSortKey, type DiscordUserTableRow, type SortDirection } from "@/lib/discord-user-columns";
import type { AccessRequestStatus } from "@/lib/access-request-rules";

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
  sort: "newest" | "oldest";
  discord: DiscordUserColumnFilters;
  userSortKey: DiscordUserSortKey | null;
  userSortDir: SortDirection;
};

const DEFAULT_FILTERS: FilterState = {
  query: "",
  status: "ALL",
  sort: "newest",
  discord: DEFAULT_DISCORD_USER_FILTERS,
  userSortKey: null,
  userSortDir: "asc",
};

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
  const [filters, setFilters] = usePersistentState("sfr:access-requests-filters-v2", DEFAULT_FILTERS);
  const patch = (next: Partial<FilterState>) => setFilters((previous) => ({ ...previous, ...next }));
  const discordRows = useMemo(() => requests.map((request) => request.discordUser), [requests]);

  useEffect(() => {
    if (focusedRequestId && focusedRequestStatus) {
      setFilters({ ...DEFAULT_FILTERS, status: focusedRequestStatus });
    } else if (initialStatus) {
      setFilters((previous) => ({ ...previous, status: initialStatus }));
    }
  }, [focusedRequestId, focusedRequestStatus, initialStatus, setFilters]);

  const rows = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase();
    const filtered = requests.filter((row) => {
      if (filters.status !== "ALL" && row.status !== filters.status) return false;
      if (!matchesDiscordUserFilters(row.discordUser, filters.discord)) return false;
      if (query && !`${row.requesterName} ${row.requesterId} ${row.approverName ?? ""} ${row.discordUser.username} ${row.discordUser.discordRoles}`.toLocaleLowerCase().includes(query)) return false;
      return true;
    });

    if (filters.userSortKey) {
      filtered.sort((a, b) => compareDiscordUsers(a.discordUser, b.discordUser, filters.userSortKey!, filters.userSortDir));
    } else {
      filtered.sort((a, b) => filters.sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
    }
    return filtered;
  }, [requests, filters]);

  return (
    <>
      <div className="toolbar">
        <input type="search" aria-label="Rechercher une demande d’accès" placeholder="Rechercher un demandeur ou un approbateur…" value={filters.query} onChange={(event) => patch({ query: event.target.value })} />
        <select aria-label="Filtrer par statut" value={filters.status} onChange={(event) => patch({ status: event.target.value as FilterState["status"] })}>
          <option value="ALL">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Acceptées</option>
          <option value="KEY_READY">Clé prête</option>
          <option value="REJECTED">Refusées</option>
          <option value="KEY_REVOKED">Clé révoquée</option>
        </select>
        <select aria-label="Trier par date de demande" value={filters.sort} onChange={(event) => patch({ sort: event.target.value as FilterState["sort"], userSortKey: null })}>
          <option value="newest">Plus récentes</option>
          <option value="oldest">Plus anciennes</option>
        </select>
        <button type="button" className="btn ghost sm" onClick={() => setFilters({ ...DEFAULT_FILTERS })}>Réinitialiser les filtres</button>
        <span className="count">{rows.length}/{requests.length}</span>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Statut</th>
              <DiscordUserColumns
                kind="header"
                sortKey={filters.userSortKey}
                sortDir={filters.userSortDir}
                onSort={(key) => patch({ userSortKey: key, userSortDir: filters.userSortKey === key && filters.userSortDir === "asc" ? "desc" : "asc" })}
              />
              <th>Soumise</th>
              <th>Décision</th>
              <th>Actions</th>
            </tr>
            <tr className="col-filter">
              <th />
              <DiscordUserColumns kind="filters" rows={discordRows} filters={filters.discord} onChange={(next) => patch({ discord: { ...filters.discord, ...next } })} />
              <th />
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={row.id === focusedRequestId ? { outline: "2px solid var(--accent)" } : undefined}>
                <td><StatusBadge status={row.status} /></td>
                <DiscordUserColumns kind="cells" user={row.discordUser} />
                <td className="mono faint">{new Date(row.createdAt).toLocaleDateString("fr-FR")}</td>
                <td>{row.decidedAt ? <><strong>{row.approverName || "Inconnu"}</strong><span className="sub">{new Date(row.decidedAt).toLocaleDateString("fr-FR")}</span><span className="sub">{row.decisionComment || "Sans commentaire"}</span></> : <span className="faint">—</span>}</td>
                <td>
                  <div className="act-cell">
                    <AccessRequestDetails request={{ name: row.requesterName, id: row.requesterId, status: row.status, communities: row.communities, motivations: row.motivations, selfHosting: row.selfHosting, discovery: row.discovery }} />
                    {row.status === "PENDING" && <><form action={decideAccessRequestAction}><input type="hidden" name="requestId" value={row.id} /><input type="hidden" name="decision" value="approve" /><button className="btn primary sm">Accepter</button></form><RejectDialog requestId={row.id} action={decideAccessRequestAction} commentField="decisionComment" /></>}
                    {admin && row.status === "APPROVED" && <form action={storeAccessRequestKey}><input type="hidden" name="requestId" value={row.id} /><input name="secret" type="password" required autoComplete="off" placeholder="Clé à remettre" className="mono" /><button className="btn primary sm">Ajouter la clé</button></form>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="empty-state">Aucune demande correspondante.</p>}
      </div>
    </>
  );
}
