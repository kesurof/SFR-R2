"use client";
import { useMemo } from "react";
import { archiveRequest, decide, deleteRequest, storeKey } from "@/app/actions";
import { StatusBadge } from "@/app/components/status-badge";
import { ConfirmSubmit } from "@/app/components/confirm-submit";
import { usePersistentState } from "@/app/components/use-persistent-state";
import { RequestDetails, type RequestDetailsData } from "@/app/admin/request-details";
import { RejectDialog } from "@/app/admin/reject-dialog";

const DEFAULT_FILTERS = { query: "", status: "ALL", sort: "newest" };

type RequestRow = {
  id: string;
  status: string;
  referredName: string;
  referredId: string;
  sponsorName: string;
  relationship: string;
  knownSince: string;
  createdAt: string;
} & RequestDetailsData;

export function RequestTable({ requests }: { requests: RequestRow[] }) {
  const [f, setF] = usePersistentState("sfr:admin:requests-filters", DEFAULT_FILTERS);
  const patch = (p: Partial<typeof f>) => setF((prev) => ({ ...prev, ...p }));

  const rows = useMemo(() => {
    const q = f.query.trim().toLocaleLowerCase();
    return requests
      .filter(
        (row) =>
          (f.status === "ALL" || row.status === f.status) &&
          (!q ||
            `${row.referredName} ${row.referredId} ${row.sponsorName} ${row.relationship}`
              .toLocaleLowerCase()
              .includes(q)),
      )
      .sort((a, b) =>
        f.sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
      );
  }, [requests, f.query, f.status, f.sort]);

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          aria-label="Rechercher une demande"
          placeholder="Rechercher un filleul, parrain ou ID…"
          value={f.query}
          onChange={(e) => patch({ query: e.target.value })}
        />
        <select aria-label="Filtrer par statut" value={f.status} onChange={(e) => patch({ status: e.target.value })}>
          <option value="ALL">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Acceptées</option>
          <option value="KEY_READY">Clé prête</option>
          <option value="REJECTED">Refusées</option>
          <option value="KEY_REVOKED">Clé révoquée</option>
          <option value="ARCHIVED">Archivées</option>
        </select>
        <select aria-label="Trier" value={f.sort} onChange={(e) => patch({ sort: e.target.value })}>
          <option value="newest">Plus récentes</option>
          <option value="oldest">Plus anciennes</option>
        </select>
        <span className="count">
          {rows.length}/{requests.length}
        </span>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Statut</th>
              <th>Filleul</th>
              <th>Parrain</th>
              <th>Relation</th>
              <th>Créée</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <StatusBadge status={row.status} />
                </td>
                <td>
                  <strong>{row.referredName}</strong>
                  <span className="sub">{row.referredId}</span>
                </td>
                <td>{row.sponsorName}</td>
                <td>
                  {row.relationship}
                  <span className="sub" style={{ fontFamily: "var(--font)" }}>
                    {row.knownSince}
                  </span>
                </td>
                <td className="mono faint">{new Date(row.createdAt).toLocaleDateString("fr-FR")}</td>
                <td>
                    <div className="act-cell">
                    <RequestDetails request={row} />
                    {row.status === "PENDING" && (
                      <>
                      <form action={decide}>
                        <input type="hidden" name="requestId" value={row.id} />
                        <button name="decision" value="approve" className="btn primary sm">
                          Accepter
                        </button>
                      </form>
                      <RejectDialog requestId={row.id} />
                      </>
                    )}
                    {row.status === "APPROVED" && (
                      <form action={storeKey}>
                        <input type="hidden" name="requestId" value={row.id} />
                        <input
                          name="secret"
                          type="password"
                          placeholder="Clé à remettre"
                          required
                          autoComplete="off"
                          className="mono"
                          style={{
                            width: "10rem",
                            height: 30,
                            padding: "0 8px",
                            fontSize: 12,
                            background: "var(--sunken)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            color: "var(--text)",
                          }}
                        />
                        <button className="btn primary sm">Enregistrer</button>
                      </form>
                    )}
                    {row.status !== "ARCHIVED" && row.status !== "KEY_READY" && (
                      <form action={archiveRequest}>
                        <input type="hidden" name="requestId" value={row.id} />
                        <button className="btn ghost sm">Archiver</button>
                      </form>
                    )}
                    <form action={deleteRequest}>
                      <input type="hidden" name="requestId" value={row.id} />
                      <ConfirmSubmit
                        title="Supprimer cette demande ?"
                        message="La demande et son historique seront définitivement effacés."
                        confirmLabel="Supprimer"
                      >
                        Supprimer
                      </ConfirmSubmit>
                    </form>
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
