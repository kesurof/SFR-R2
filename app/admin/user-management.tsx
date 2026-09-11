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
      {users.length ? (
        <UserTable users={users} />
      ) : (
        <p className="empty-state">Lance une synchronisation pour importer les membres.</p>
      )}
    </div>
  );
}
