import { restoreManualAccessAction } from "@/app/actions";
import { syncMembers } from "@/app/actions-sync";
import { prisma } from "@/lib/prisma";
import { UserTable } from "@/app/admin/user-table";
import { PendingButton } from "@/app/components/pending-button";

export async function UserManagement() {
  const [users, sponsorCount, syncState] = await Promise.all([
    prisma.user.findMany({ include: { sponsorPermission: true, accessApproverPermission: true }, orderBy: { username: "asc" }, take: 1000 }),
    prisma.sponsorPermission.count(),
    prisma.syncState.findUnique({ where: { id: "discord" } }),
  ]);

  return (
    <div className="panel">
      <div className="panel-head">
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h2>Utilisateurs Discord</h2>
          <span className="faint" style={{ fontSize: 11.5 }}>
            {users.length} membres · {sponsorCount} parrain{sponsorCount > 1 ? "s" : ""} autorisé
            {sponsorCount > 1 ? "s" : ""}
          </span>
        </div>
        <form action={syncMembers}>
          <PendingButton className="btn ghost sm" pendingLabel="Synchronisation…">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            Synchroniser Discord
          </PendingButton>
        </form>
      </div>
      <div className="sync-status"><span className={`badge ${syncState?.status === "SUCCESS" ? "ready" : syncState?.status === "ERROR" ? "rejected" : "pending"}`}>{syncState?.status === "SUCCESS" ? "Synchronisation réussie" : syncState?.status === "ERROR" ? "Erreur de synchronisation" : syncState?.status === "RUNNING" ? "Synchronisation en cours" : "Jamais synchronisé"}</span><span className="faint">{syncState?.completedAt ? `${syncState.memberCount} membres · ${syncState.completedAt.toLocaleString("fr-FR")}` : "Aucune synchronisation enregistrée"}</span></div>
      <div className="panel-body">
        <div className="section" style={{ marginTop: 0 }}>
          <h3 style={{ fontSize: 14 }}>Restaurer un accès</h3>
          <p className="faint" style={{ fontSize: 12, margin: "4px 0 var(--s4)" }}>
            Recrée un utilisateur absent de la base et lui attribue immédiatement une clé active. La date retenue sera celle de la restauration.
          </p>
          <form action={restoreManualAccessAction} className="stack">
            <div className="grid-2">
              <label className="field">
                <span>Discord ID</span>
                <input name="discordId" required inputMode="numeric" pattern="[0-9]{17,20}" placeholder="Identifiant Discord" />
              </label>
              <label className="field">
                <span>Nom Discord</span>
                <input name="username" required placeholder="Nom utilisé si l’utilisateur est nouveau" />
              </label>
              <label className="field">
                <span>Pseudo serveur <span className="faint">· facultatif</span></span>
                <input name="serverNickname" placeholder="Pseudo affiché sur le serveur" />
              </label>
              <label className="field">
                <span>Clé complète</span>
                <input name="secret" type="password" required autoComplete="new-password" className="mono" placeholder="Clé R2 à restaurer" />
                <span className="hint">Elle sera chiffrée immédiatement et ne sera jamais affichée dans l’historique.</span>
              </label>
            </div>
            <div>
              <PendingButton pendingLabel="Restauration…" className="btn primary sm">Restaurer l’accès</PendingButton>
            </div>
          </form>
        </div>
      </div>
      {users.length ? (
        <UserTable users={users} />
      ) : (
        <p className="empty-state">Lance une synchronisation pour importer les membres.</p>
      )}
    </div>
  );
}
