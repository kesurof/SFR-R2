"use client";

import { useEffect, useMemo } from "react";
import { setAccessApprover, setSponsor } from "@/app/actions";
import { DiscordUserColumns, SortHeader } from "@/app/components/discord-user-columns";
import { usePersistentState } from "@/app/components/use-persistent-state";
import { collectDiscordRoles, compareDiscordUsers, DEFAULT_DISCORD_USER_FILTERS, matchesDiscordUserFilters, parseDiscordRoles, type DiscordUserColumnFilters, type DiscordUserSortKey, type DiscordUserTableRow, type SortDirection } from "@/lib/discord-user-columns";

type User = DiscordUserTableRow & {
  id: string;
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
  discord: DEFAULT_DISCORD_USER_FILTERS,
  sortKey: "" as "" | DiscordUserSortKey | "approval",
  sortDir: "asc" as SortDirection,
  page: 1,
};

export function UserTable({ users }: { users: User[] }) {
  const [f, setF] = usePersistentState("sfr:admin:users-filters", DEFAULT_FILTERS);
  const patch = (next: Partial<typeof f>) => setF((previous) => ({ ...previous, ...next }));
  const discordFilters = useMemo<DiscordUserColumnFilters>(() => ({
    nickname: f.discord?.nickname ?? f.fNick ?? "",
    username: f.discord?.username ?? f.fName ?? "",
    discordId: f.discord?.discordId ?? f.fId ?? "",
    role: f.discord?.role ?? f.fRole ?? "",
  }), [f.discord, f.fNick, f.fName, f.fId, f.fRole]);
  const allRoles = useMemo(() => collectDiscordRoles(users), [users]);

  useEffect(() => {
    if (discordFilters.role && discordFilters.role !== "__none" && !allRoles.includes(discordFilters.role)) {
      patch({ discord: { ...discordFilters, role: "" }, fRole: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRoles, discordFilters.role]);

  const filtered = useMemo(() => {
    const global = f.global.trim().toLocaleLowerCase();
    const rows = users.filter((user) => {
      if (!matchesDiscordUserFilters(user, discordFilters)) return false;
      if (f.fSponsor === "yes" && !user.sponsorPermission) return false;
      if (f.fSponsor === "no" && user.sponsorPermission) return false;
      if (f.fApproval === "yes" && !user.accessApproverPermission) return false;
      if (f.fApproval === "no" && user.accessApproverPermission) return false;
      if (global) {
        const haystack = `${user.serverNickname ?? ""} ${user.username} ${user.discordId} ${parseDiscordRoles(user.discordRoles).join(" ")}`.toLocaleLowerCase();
        if (!haystack.includes(global)) return false;
      }
      return true;
    });

    if (f.sortKey) {
      const direction = f.sortDir === "asc" ? 1 : -1;
      rows.sort((a, b) => {
        if (f.sortKey === "approval") return ((a.accessApproverPermission ? 1 : 0) - (b.accessApproverPermission ? 1 : 0)) * direction;
        if (f.sortKey === "server" || f.sortKey === "account") return compareDiscordUsers(a, b, f.sortKey, f.sortDir);
        return 0;
      });
    }
    return rows;
  }, [users, f.global, f.fSponsor, f.fApproval, f.sortKey, f.sortDir, discordFilters]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(f.page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <>
      <div className="toolbar">
        <input type="search" aria-label="Recherche globale" placeholder="Recherche globale…" value={f.global} onChange={(event) => patch({ global: event.target.value, page: 1 })} />
        <button type="button" className="btn ghost sm" onClick={() => setF({ ...DEFAULT_FILTERS })}>Réinitialiser les filtres</button>
        <span className="count">{filtered.length} / {users.length}</span>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <DiscordUserColumns
                kind="header"
                sortKey={f.sortKey === "server" || f.sortKey === "account" ? f.sortKey : null}
                sortDir={f.sortDir}
                onSort={(key) => patch({ sortKey: key, sortDir: f.sortKey === key && f.sortDir === "asc" ? "desc" : "asc", page: 1 })}
              />
              <th>Parrainage</th>
              <th><SortHeader label="Approbation" active={f.sortKey === "approval"} direction={f.sortDir} onClick={() => patch(f.sortKey === "approval" ? { sortDir: f.sortDir === "asc" ? "desc" : "asc" } : { sortKey: "approval", sortDir: "asc", page: 1 })} /></th>
            </tr>
            <tr className="col-filter">
              <DiscordUserColumns kind="filters" rows={users} filters={discordFilters} onChange={(next) => patch({ discord: { ...discordFilters, ...next }, page: 1 })} />
              <th>
                <select aria-label="Filtrer par parrainage" value={f.fSponsor} onChange={(event) => patch({ fSponsor: event.target.value, page: 1 })}>
                  <option value="">Tous</option>
                  <option value="yes">Autorisé</option>
                  <option value="no">Non autorisé</option>
                </select>
              </th>
              <th>
                <select aria-label="Filtrer par approbation" value={f.fApproval} onChange={(event) => patch({ fApproval: event.target.value, page: 1 })}>
                  <option value="">Tous</option>
                  <option value="yes">Autorisé</option>
                  <option value="no">Non autorisé</option>
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((user) => (
              <tr key={user.id}>
                <DiscordUserColumns kind="cells" user={user} />
                <td>
                  <form action={setSponsor}>
                    <input type="hidden" name="discordId" value={user.discordId} />
                    <button type="submit" name="action" value={user.sponsorPermission ? "revoke" : "grant"} className={`btn sm ${user.sponsorPermission ? "ghost" : "primary"}`}>
                      {user.sponsorPermission ? "Retirer" : "Autoriser"}
                    </button>
                  </form>
                </td>
                <td>
                  <form action={setAccessApprover}>
                    <input type="hidden" name="discordId" value={user.discordId} />
                    <button type="submit" name="action" value={user.accessApproverPermission ? "revoke" : "grant"} className={`btn sm ${user.accessApproverPermission ? "ghost" : "primary"}`}>
                      {user.accessApproverPermission ? "Retirer" : "Autoriser"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="empty-state">Aucun utilisateur ne correspond aux filtres.</p>}
      </div>
      {pages > 1 && (
        <div className="toolbar" style={{ borderTop: "1px solid var(--border)", borderBottom: 0 }}>
          <button type="button" className="btn ghost sm" disabled={current === 1} onClick={() => patch({ page: current - 1 })}>Précédent</button>
          <span className="count" style={{ marginLeft: 0 }}>Page {current} / {pages}</span>
          <button type="button" className="btn ghost sm" disabled={current === pages} onClick={() => patch({ page: current + 1 })}>Suivant</button>
        </div>
      )}
    </>
  );
}
