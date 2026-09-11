import Link from "next/link";
import { clearAccessRequestWebhook, revoke, updateNotificationSettings } from "@/app/actions";
import { UserManagement } from "@/app/admin/user-management";
import { RequestTable } from "@/app/admin/request-table";
import { ConfirmSubmit } from "@/app/components/confirm-submit";
import { identity, isAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getNotificationSettings } from "@/lib/settings";

type View = "requests" | "users" | "keys" | "settings";
const VIEWS: { id: View; label: string }[] = [
  { id: "requests", label: "Demandes" },
  { id: "users", label: "Utilisateurs" },
  { id: "keys", label: "Clés actives" },
  { id: "settings", label: "Configuration" },
];

// Bornes de chargement : la page reste rapide quand l'historique grandit.
const REQUESTS_LIMIT = 500;
const KEYS_LIMIT = 500;
// SQLite limite le nombre de variables d'une requête `IN (…)` : on découpe.
const AUDIT_CHUNK = 400;

type AuditRow = { event: string; actorDiscordId: string | null; requestId: string | null; createdAt: Date };

async function fetchAudits(requestIds: string[]): Promise<AuditRow[]> {
  const rows: AuditRow[] = [];
  for (let index = 0; index < requestIds.length; index += AUDIT_CHUNK) {
    rows.push(
      ...(await prisma.auditLog.findMany({
        where: { requestId: { in: requestIds.slice(index, index + AUDIT_CHUNK) } },
        orderBy: { createdAt: "asc" },
        select: { event: true, actorDiscordId: true, requestId: true, createdAt: true },
      })),
    );
  }
  return rows;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const actor = await identity();
  if (!isAdmin(actor.discordId)) return null;
  const query = await searchParams;
  const view: View = VIEWS.some((v) => v.id === query.view) ? (query.view as View) : "requests";

  const [requests, keys, memberCount, pending, activeKeyCount, requestTotal, keyTotal, notificationStats] = await Promise.all([
    prisma.sponsorshipRequest.findMany({
      include: { sponsor: true, referred: true },
      orderBy: { createdAt: "desc" },
      take: REQUESTS_LIMIT,
    }),
    prisma.accessKey.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: KEYS_LIMIT }),
    prisma.user.count(),
    prisma.sponsorshipRequest.count({ where: { status: "PENDING" } }),
    prisma.accessKey.count({ where: { status: "ACTIVE" } }),
    prisma.sponsorshipRequest.count(),
    prisma.accessKey.count(),
    prisma.discordNotification.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const pendingNotifications = notificationStats.find((item) => item.status === "PENDING")?._count._all ?? 0;
  const failedNotifications = notificationStats.find((item) => item.status === "FAILED")?._count._all ?? 0;
  const settings = view === "settings" ? await getNotificationSettings() : null;

  // Historique d'audit des demandes affichées — une requête par lot, puis un index en mémoire.
  const audits = requests.length ? await fetchAudits(requests.map((request) => request.id)) : [];
  const auditsByRequest = new Map<string, AuditRow[]>();
  for (const row of audits) {
    if (!row.requestId) continue;
    const list = auditsByRequest.get(row.requestId);
    if (list) list.push(row);
    else auditsByRequest.set(row.requestId, [row]);
  }

  // Parrain de chaque clé : une seule requête pour toutes les clés (au lieu d'une par clé).
  const keyUserIds = [...new Set(keys.map((key) => key.userId))];
  const sponsorSources = keyUserIds.length
    ? await prisma.sponsorshipRequest.findMany({
        where: { referredId: { in: keyUserIds } },
        orderBy: { createdAt: "desc" },
        include: { sponsor: true },
      })
    : [];
  const sponsorByReferred = new Map<string, string>();
  for (const source of sponsorSources) {
    if (sponsorByReferred.has(source.referredId)) continue; // le tri décroissant garde la plus récente
    sponsorByReferred.set(source.referredId, source.sponsor.serverNickname || source.sponsor.username);
  }

  const keyRows = keys.map((key) => ({
    id: key.id,
    member: key.user.serverNickname || key.user.username || key.user.discordId,
    discordId: key.user.discordId,
    fingerprint: `${key.prefix}••••••••${key.suffix}`,
    status: key.status,
    revokedAt: key.revokedAt,
    createdAt: key.createdAt,
    sponsor: sponsorByReferred.get(key.userId) ?? "Équipe",
  }));

  const requestRows = requests.map((request) => ({
    id: request.id,
    status: request.status,
    referredName: request.referred.serverNickname || request.referred.username || request.referred.discordId,
    referredId: request.referred.discordId,
    sponsorName: request.sponsor.serverNickname || request.sponsor.username,
    sponsorId: request.sponsor.discordId,
    referredUsername: request.referred.username,
    referredNickname: request.referred.serverNickname,
    relationship: request.relationship,
    knownSince: request.knownSince,
    context: request.context,
    comment: request.comment,
    attestationAccepted: request.attestationAccepted,
    attestationAcceptedAt: request.attestationAcceptedAt?.toISOString() ?? null,
    decidedAt: request.decidedAt?.toISOString() ?? null,
    decidedByDiscordId: request.decidedByDiscordId,
    rejectionReason: request.rejectionReason,
    audits: (auditsByRequest.get(request.id) ?? []).map((audit) => ({
      event: audit.event,
      actorDiscordId: audit.actorDiscordId,
      createdAt: audit.createdAt.toISOString(),
    })),
    createdAt: request.createdAt.toISOString(),
  }));

  const requestsTruncated = requestTotal > requests.length;
  const keysTruncated = keyTotal > keys.length;

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="eyebrow">Administration</span>
        <h1>Gestion des accès</h1>
      </div>

      <div className="counts">
        <div className={`count-tile${pending ? " alert" : ""}`}>
          <div className="v">{pending}</div>
          <div className="k">Demandes en attente</div>
        </div>
        <div className="count-tile">
          <div className="v">{activeKeyCount}</div>
          <div className="k">Clés actives</div>
        </div>
        <div className="count-tile">
          <div className="v">{pendingNotifications + failedNotifications}</div>
          <div className="k">Notifications à traiter</div>
        </div>
        <div className="count-tile">
          <div className="v">{memberCount}</div>
          <div className="k">Membres synchronisés</div>
        </div>
      </div>

      <nav className="tabs" aria-label="Sections d'administration">
        {VIEWS.map((v) => (
          <Link key={v.id} href={`/admin?view=${v.id}`} aria-current={view === v.id ? "page" : undefined}>
            {v.label}
            {v.id === "requests" && pending > 0 ? <span className="pill">{pending}</span> : null}
          </Link>
        ))}
      </nav>

      {view === "requests" && (
        <div className="panel">
          <div className="panel-head">
            <h2>Demandes de parrainage</h2>
            <span className="faint" style={{ fontSize: 11.5 }}>
              {requestsTruncated ? `${requests.length} plus récentes sur ${requestTotal}` : requestTotal}
            </span>
          </div>
          <RequestTable requests={requestRows} />
          {requestsTruncated && (
            <p className="empty-state">
              Seules les {REQUESTS_LIMIT} demandes les plus récentes sont chargées. Les plus anciennes
              restent consultables dans l’historique des clés et les journaux d’audit.
            </p>
          )}
        </div>
      )}

      {view === "users" && <UserManagement />}

      {view === "keys" && (
        <div className="panel">
          <div className="panel-head">
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <h2>Historique des clés</h2>
              <span className="faint" style={{ fontSize: 11.5 }}>
                {keysTruncated ? `${keys.length} plus récentes sur ${keyTotal}` : keyTotal}
              </span>
            </div>
            <span className="faint" style={{ fontSize: 11.5 }}>
              Le parrain reste le référent du filleul.
            </span>
          </div>
          {keyRows.length ? (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Parrainé par</th>
                    <th>Empreinte</th>
                    <th>Émise</th>
                    <th>Révoquée</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {keyRows.map((k) => (
                    <tr key={k.id}>
                      <td>
                        <strong>{k.member}</strong>
                        <span className="sub">{k.discordId}</span>
                      </td>
                      <td>
                        <span className="chip" style={{ padding: "2px 8px" }}>
                          <span
                            className="dot"
                            style={{ background: k.sponsor === "Équipe" ? "var(--faint)" : "#5865F2" }}
                          />
                          {k.sponsor}
                        </span>
                      </td>
                      <td className="mono">{k.fingerprint}</td>
                      <td className="mono faint">{k.createdAt.toLocaleDateString("fr-FR")}</td>
                      <td className="mono faint">{k.revokedAt ? k.revokedAt.toLocaleDateString("fr-FR") : "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        {k.status === "ACTIVE" && (
                          <form action={revoke}>
                            <input type="hidden" name="keyId" value={k.id} />
                            <ConfirmSubmit
                              title="Révoquer cette clé ?"
                              message="Le membre perdra immédiatement l'accès au stockage R2. Une nouvelle clé devra être émise."
                              confirmLabel="Révoquer"
                            >
                              Révoquer
                            </ConfirmSubmit>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">Aucune clé enregistrée.</p>
          )}
        </div>
      )}

      {view === "settings" && settings && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Notifications Discord</h2>
              <p className="faint" style={{ marginTop: 4 }}>Réglages des notifications envoyées par le portail.</p>
            </div>
            <span className={`badge ${settings.discordNotificationsEnabled ? "ready" : "archived"}`}>
              {settings.discordNotificationsEnabled ? "Activées" : "Désactivées"}
            </span>
          </div>
          <div className="panel-body">
            <form action={updateNotificationSettings} className="settings-form">
              <label className="settings-toggle">
                <input type="checkbox" name="discordNotificationsEnabled" value="true" defaultChecked={settings.discordNotificationsEnabled} />
                <span>
                  <strong>Notifications privées activées</strong>
                  <span className="sub">Les changements s’appliquent sans redémarrer le conteneur.</span>
                </span>
              </label>
              <div className="field settings-interval">
                <label htmlFor="notificationWorkerIntervalSeconds">Intervalle de traitement</label>
                <div className="inline-field">
                  <input id="notificationWorkerIntervalSeconds" name="notificationWorkerIntervalSeconds" type="number" min={10} max={3600} step={1} defaultValue={settings.notificationWorkerIntervalSeconds} required />
                  <span className="faint">secondes</span>
                </div>
                <span className="hint">Entre 10 et 3 600 secondes. Les notifications sont traitées en arrière-plan ; aucune clé ni aucun token n’est transmis.</span>
              </div>
              <div className="field settings-webhook">
                <label htmlFor="accessRequestWebhookUrl">Webhook Discord des nouvelles demandes</label>
                <div className="inline-field">
                  <input id="accessRequestWebhookUrl" name="accessRequestWebhookUrl" type="password" autoComplete="new-password" spellCheck={false} placeholder={settings.accessRequestWebhookConfigured ? "Webhook configuré — laisser vide pour le conserver" : "https://discord.com/api/webhooks/…"} />
                  {settings.accessRequestWebhookConfigured && <span className="badge ready">Configuré</span>}
                </div>
                <span className="hint">L’URL est chiffrée et masquée. Elle sert uniquement à publier un embed lors d’une nouvelle demande d’accès. Laissez vide pour conserver le webhook actuel.</span>
              </div>
              <div className="banner info" role="note">
                <div><b>À savoir</b><p>Les messages en attente sont conservés si les notifications sont désactivées, puis repris lors de la réactivation.</p></div>
              </div>
              <div className="settings-actions">
                <button className="btn primary" type="submit">Enregistrer</button>
                <span className="faint settings-updated">Dernière modification : {settings.updatedAt.toLocaleString("fr-FR")} {settings.updatedByDiscordId ? `par ${settings.updatedByDiscordId}` : "(initialisation)"}</span>
              </div>
            </form>
            {settings.accessRequestWebhookConfigured && (
              <form action={clearAccessRequestWebhook} className="settings-webhook-actions">
                <ConfirmSubmit title="Supprimer le webhook ?" message="Les nouvelles demandes ne seront plus envoyées à ce webhook. Cette action ne peut pas être annulée automatiquement." confirmLabel="Supprimer le webhook">
                  Supprimer le webhook
                </ConfirmSubmit>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
