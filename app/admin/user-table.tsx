"use client";
import { useEffect, useMemo } from "react";
import { setAccessApprover, setSponsor } from "@/app/actions";
import { usePersistentState } from "@/app/components/use-persistent-state";
import { accountCreatedAt, formatAge } from "@/lib/member-age";

type User = {
  id: string;
  discordId: string;
  username: string;
  serverNickname: string | null;
  discordRoles: string;
  joinedAt: Date | string | null;
  sponsorPermission: { id: string } | null;
  accessApproverPermission: { id: string } | null;
};

const PAGE_SIZE = 100;

const DEFAULT_FILTERS = {
  global: "",
  fNick: "",
  fName: "",
  fId: "",
  fRole: "",
  fSponsor: "",
  fApproval: "",
  sortKey: "" as "" | "server" | "account" | "approval",
  sortDir: "asc" as "asc" | "desc",
  page: 1,
};

function parseRoles(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return [];
  }
}

const toDate = (v: Date | string | null): Date | null => (v ? new Date(v) : null);

export function UserTable({ users }: { users: User[] }) {
  const [f, setF] = usePersistentState("sfr:admin:users-filters", DEFAULT_FILTERS);
  const patch = (p: Partial<typeof f>) => setF((prev) => ({ ...prev, ...p }));

  const allRoles = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => parseRoles(u.discordRoles).forEach((r) => set.add(r)));
    return [...set].sort();
  }, [users]);

  // Un rôle filtré qui n'existe plus (renommé côté Discord) → on nettoie le filtre.
  useEffect(() => {
    if (f.fRole && f.fRole !== "__none" && !allRoles.includes(f.fRole)) {
      patch({ fRole: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRoles, f.fRole]);

  const filtered = useMemo(() => {
    const g = f.global.trim().toLowerCase();
    const nick = f.fNick.trim().toLowerCase();
    const name = f.fName.trim().toLowerCase();
    const id = f.fId.trim().toLowerCase();
    const rows = users.filter((u) => {
      const roles = parseRoles(u.discordRoles);
      const rowNick = (u.serverNickname ?? "").toLowerCase();
      if (nick && !rowNick.includes(nick)) return false;
      if (name && !u.username.toLowerCase().includes(name)) return false;
      if (id && !u.discordId.toLowerCase().includes(id)) return false;
      if (f.fRole === "__none" && roles.length > 0) return false;
      if (f.fRole && f.fRole !== "__none" && !roles.includes(f.fRole)) return false;
      if (f.fSponsor === "yes" && !u.sponsorPermission) return false;
      if (f.fSponsor === "no" && u.sponsorPermission) return false;
      if (f.fApproval === "yes" && !u.accessApproverPermission) return false;
      if (f.fApproval === "no" && u.accessApproverPermission) return false;
      if (g) {
        const hay = `${rowNick} ${u.username} ${u.discordId} ${roles.join(" ")}`.toLowerCase();
        if (!hay.includes(g)) return false;
      }
      return true;
    });

    if (f.sortKey) {
      const ts = (u: User) => {
        if (f.sortKey === "approval") return u.accessApproverPermission ? 1 : 0;
        const d = f.sortKey === "server" ? toDate(u.joinedAt) : accountCreatedAt(u.discordId);
        return d ? d.getTime() : null;
      };
      const dir = f.sortDir === "asc" ? 1 : -1;
      rows.sort((a, b) => {
        const ta = ts(a);
        const tb = ts(b);
        // Les valeurs inconnues restent en fin de liste, quel que soit le sens.
        if (ta === null && tb === null) return 0;
        if (ta === null) return 1;
        if (tb === null) return -1;
        return (ta - tb) * dir;
      });
    }
    return rows;
  }, [users, f.global, f.fNick, f.fName, f.fId, f.fRole, f.fSponsor, f.fApproval, f.sortKey, f.sortDir]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(f.page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function sortHeader(label: string, key: "server" | "account" | "approval") {
    const active = f.sortKey === key;
    return (
      <button
        type="button"
        className="th-sort"
        aria-label={`Trier par ${label}`}
        onClick={() =>
          patch(
            active
              ? { sortDir: f.sortDir === "asc" ? "desc" : "asc" }
              : { sortKey: key, sortDir: "asc", page: 1 },
          )
        }
      >
        {label}
        <span className="th-arrow">{active ? (f.sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    );
  }

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          aria-label="Recherche globale"
          placeholder="Recherche globale…"
          value={f.global}
          onChange={(e) => patch({ global: e.target.value, page: 1 })}
        />
        <button type="button" className="btn ghost sm" onClick={() => setF({ ...DEFAULT_FILTERS })}>
          Réinitialiser les filtres
        </button>
        <span className="count">
          {filtered.length} / {users.length}
        </span>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Pseudo serveur</th>
              <th>Nom Discord</th>
              <th>Discord ID</th>
              <th>Rôles</th>
              <th>{sortHeader("Sur le serveur", "server")}</th>
              <th>{sortHeader("Compte Discord", "account")}</th>
              <th>Parrainage</th>
              <th>{sortHeader("Approbation", "approval")}</th>
            </tr>
            <tr className="col-filter">
              <th>
                <input aria-label="Filtrer par pseudo serveur" placeholder="Filtrer…" value={f.fNick} onChange={(e) => patch({ fNick: e.target.value, page: 1 })} />
              </th>
              <th>
                <input aria-label="Filtrer par nom Discord" placeholder="Filtrer…" value={f.fName} onChange={(e) => patch({ fName: e.target.value, page: 1 })} />
              </th>
              <th>
                <input aria-label="Filtrer par Discord ID" className="mono" placeholder="Filtrer…" value={f.fId} onChange={(e) => patch({ fId: e.target.value, page: 1 })} />
              </th>
              <th>
                <select aria-label="Filtrer par rôle" value={f.fRole} onChange={(e) => patch({ fRole: e.target.value, page: 1 })}>
                  <option value="">Tous les rôles</option>
                  {allRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="__none">Sans rôle</option>
                </select>
              </th>
              <th />
              <th />
              <th>
                <select aria-label="Filtrer par parrainage" value={f.fSponsor} onChange={(e) => patch({ fSponsor: e.target.value, page: 1 })}>
                  <option value="">Tous</option>
                  <option value="yes">Autorisé</option>
                  <option value="no">Non autorisé</option>
                </select>
              </th>
              <th>
                <select aria-label="Filtrer par approbation" value={f.fApproval} onChange={(e) => patch({ fApproval: e.target.value, page: 1 })}>
                  <option value="">Tous</option>
                  <option value="yes">Autorisé</option>
                  <option value="no">Non autorisé</option>
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => {
              const roles = parseRoles(u.discordRoles);
              const joined = toDate(u.joinedAt);
              const created = accountCreatedAt(u.discordId);
              return (
                <tr key={u.id}>
                  <td>
                    <strong>{u.serverNickname || "—"}</strong>
                  </td>
                  <td>{u.username}</td>
                  <td className="mono faint">{u.discordId}</td>
                  <td>
                    {roles.length ? (
                      <div className="rolechips">
                        {roles.map((r) => (
                          <span className="rolechip" key={r}>
                            {r}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="faint">—</span>
                    )}
                  </td>
                  <td className="faint" title={joined?.toLocaleDateString("fr-FR")}>
                    {formatAge(joined)}
                  </td>
                  <td className="faint" title={created?.toLocaleDateString("fr-FR")}>
                    {formatAge(created)}
                  </td>
                  <td>
                    <form action={setSponsor}>
                      <input type="hidden" name="discordId" value={u.discordId} />
                      <button
                        type="submit"
                        name="action"
                        value={u.sponsorPermission ? "revoke" : "grant"}
                        className={`btn sm ${u.sponsorPermission ? "ghost" : "primary"}`}
                      >
                        {u.sponsorPermission ? "Retirer" : "Autoriser"}
                      </button>
                    </form>
                  </td>
                  <td>
                    <form action={setAccessApprover}>
                      <input type="hidden" name="discordId" value={u.discordId} />
                      <button type="submit" name="action" value={u.accessApproverPermission ? "revoke" : "grant"} className={`btn sm ${u.accessApproverPermission ? "ghost" : "primary"}`}>
                        {u.accessApproverPermission ? "Retirer" : "Autoriser"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && <p className="empty-state">Aucun utilisateur ne correspond aux filtres.</p>}
      </div>
      {pages > 1 && (
        <div className="toolbar" style={{ borderTop: "1px solid var(--border)", borderBottom: 0 }}>
          <button type="button" className="btn ghost sm" disabled={current === 1} onClick={() => patch({ page: current - 1 })}>
            Précédent
          </button>
          <span className="count" style={{ marginLeft: 0 }}>
            Page {current} / {pages}
          </span>
          <button type="button" className="btn ghost sm" disabled={current === pages} onClick={() => patch({ page: current + 1 })}>
            Suivant
          </button>
        </div>
      )}
    </>
  );
}
