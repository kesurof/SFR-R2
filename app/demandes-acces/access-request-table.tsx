"use client";

import { useEffect, useMemo } from "react";
import { decideAccessRequestAction, storeAccessRequestKey } from "@/app/actions";
import { RejectDialog } from "@/app/admin/reject-dialog";
import { StatusBadge } from "@/app/components/status-badge";
import { usePersistentState } from "@/app/components/use-persistent-state";
import { AccessRequestDetails } from "@/app/demandes-acces/access-request-details";
import type { AccessRequestStatus } from "@/lib/access-request-rules";

type Row = {
  id: string;
  status: string;
  requesterName: string;
  requesterId: string;
  createdAt: string;
  decidedAt: string | null;
  approverName: string | null;
  decisionComment: string | null;
  communities: string;
  motivations: string;
  selfHosting: string;
  discovery: string | null;
};

type FilterState = { query: string; status: "ALL" | AccessRequestStatus; sort: "newest" | "oldest" };
const DEFAULT_FILTERS: FilterState = { query: "", status: "ALL", sort: "newest" };

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
  const [filters, setFilters] = usePersistentState("sfr:access-requests-filters", DEFAULT_FILTERS);
  const patch = (next: Partial<typeof filters>) => setFilters((previous) => ({ ...previous, ...next }));

  useEffect(() => {
    if (focusedRequestId && focusedRequestStatus) {
      setFilters({ ...DEFAULT_FILTERS, status: focusedRequestStatus });
    } else if (initialStatus) {
      setFilters((previous) => ({ ...previous, status: initialStatus }));
    }
  }, [focusedRequestId, focusedRequestStatus, initialStatus, setFilters]);

  const rows = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase();
    return requests
      .filter((row) =>
        (filters.status === "ALL" || row.status === filters.status) &&
        (!query || `${row.requesterName} ${row.requesterId} ${row.approverName ?? ""}`.toLocaleLowerCase().includes(query)),
      )
      .sort((a, b) =>
        filters.sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
      );
  }, [requests, filters]);

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          aria-label="Rechercher une demande d’accès"
          placeholder="Rechercher un demandeur ou un approbateur…"
          value={filters.query}
          onChange={(event) => patch({ query: event.target.value })}
        />
        <select aria-label="Filtrer par statut" value={filters.status} onChange={(event) => patch({ status: event.target.value as FilterState["status"] })}>
          <option value="ALL">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Acceptées</option>
          <option value="KEY_READY">Clé prête</option>
          <option value="REJECTED">Refusées</option>
          <option value="KEY_REVOKED">Clé révoquée</option>
        </select>
        <select aria-label="Trier" value={filters.sort} onChange={(event) => patch({ sort: event.target.value as FilterState["sort"] })}>
          <option value="newest">Plus récentes</option>
          <option value="oldest">Plus anciennes</option>
        </select>
        <span className="count">{rows.length}/{requests.length}</span>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr><th>Statut</th><th>Demandeur</th><th>Soumise</th><th>Décision</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={row.id === focusedRequestId ? { outline: "2px solid var(--accent)" } : undefined}>
                <td><StatusBadge status={row.status} /></td>
                <td><strong>{row.requesterName}</strong><span className="sub">{row.requesterId}</span></td>
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
