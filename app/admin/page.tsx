import Link from "next/link";
import { Button, Card, Checkbox, Col, Input, Menu, Row, Space, Statistic, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import Password from "antd/es/input/Password";
import { clearAccessRequestWebhook, updateNotificationSettings } from "@/app/actions";
import { UserManagement } from "@/app/admin/user-management";
import { RequestTable } from "@/app/admin/request-table";
import { KeysTable, type KeyOriginView, type KeyRow } from "@/app/admin/keys-table";
import { RestoreAccessForm } from "@/app/admin/restore-access-form";
import { ConfirmSubmit } from "@/app/components/confirm-submit";
import { FormField } from "@/app/components/form-field";
import { identity, isAdmin } from "@/lib/access";
import { accessKeyFingerprint } from "@/lib/access-key-rules";
import { previousKeyIdFromMetadata, resolveKeyOrigin, type KeyOriginAudit } from "@/lib/key-origin";
import { buildKeyReplacementViews } from "@/lib/key-replacement-rules";
import { prisma } from "@/lib/prisma";
import { getNotificationSettings } from "@/lib/settings";

type View = "requests" | "users" | "keys" | "restore" | "settings";
const VIEWS: { id: View; label: string }[] = [
  { id: "requests", label: "Demandes" },
  { id: "users", label: "Utilisateurs" },
  { id: "keys", label: "Clés" },
  { id: "restore", label: "Restaurer un accès" },
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

const KEY_ORIGIN_EVENTS = ["ACCESS_KEY_CREATED", "ACCESS_REQUEST_KEY_READY", "ACCESS_KEY_REPLACED", "ACCESS_KEY_RESTORED_MANUALLY"];
const ORIGIN_CHAIN_DEPTH = 5;

/** Audits de création des clés, en suivant les remplacements pour retrouver l'origine. */
async function fetchOriginAudits(seedKeyIds: string[]): Promise<Map<string, KeyOriginAudit>> {
  const byKeyId = new Map<string, KeyOriginAudit>();
  let pending = [...new Set(seedKeyIds)];
  for (let depth = 0; depth < ORIGIN_CHAIN_DEPTH && pending.length; depth += 1) {
    const rows = await prisma.auditLog.findMany({
      where: { keyId: { in: pending }, event: { in: KEY_ORIGIN_EVENTS } },
      orderBy: { createdAt: "asc" },
      select: { keyId: true, event: true, actorDiscordId: true, requestId: true, metadata: true },
    });
    const next = new Set<string>();
    for (const row of rows) {
      if (!row.keyId || byKeyId.has(row.keyId)) continue;
      byKeyId.set(row.keyId, { event: row.event, actorDiscordId: row.actorDiscordId, requestId: row.requestId, metadata: row.metadata });
      if (row.event === "ACCESS_KEY_REPLACED") {
        const previous = previousKeyIdFromMetadata(row.metadata);
        if (previous && !byKeyId.has(previous)) next.add(previous);
      }
    }
    pending = [...next];
  }
  return byKeyId;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ view?: string; replacementRequest?: string }> }) {
  const actor = await identity();
  if (!isAdmin(actor.discordId)) return null;
  const query = await searchParams;
  const view: View = VIEWS.some((v) => v.id === query.view) ? (query.view as View) : "requests";
  const replacementRequestId = query.replacementRequest;

  const keys = await prisma.accessKey.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: KEYS_LIMIT });
  const keyIds = keys.map((key) => key.id);

  // Toutes les demandes en attente (file de travail), les demandes liées aux clés
  // affichées (en attente, refusées ou abouties) et la demande ciblée par un lien direct.
  const replacementRequests = await prisma.keyReplacementRequest.findMany({
    where: {
      OR: [
        { status: "PENDING" },
        { currentKeyId: { in: keyIds } },
        { newKeyId: { in: keyIds } },
        ...(replacementRequestId ? [{ id: replacementRequestId }] : []),
      ],
    },
    include: { user: true, currentKey: true },
    orderBy: { createdAt: "desc" },
    take: KEYS_LIMIT,
  });

  const [requests, memberCount, pending, activeKeyCount, requestTotal, keyTotal, notificationStats] = await Promise.all([
    prisma.sponsorshipRequest.findMany({
      include: { sponsor: true, referred: true },
      orderBy: { createdAt: "desc" },
      take: REQUESTS_LIMIT,
    }),
    prisma.user.count(),
    prisma.sponsorshipRequest.count({ where: { status: "PENDING" } }),
    prisma.accessKey.count({ where: { status: "ACTIVE" } }),
    prisma.sponsorshipRequest.count(),
    prisma.accessKey.count(),
    prisma.discordNotification.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const replacementKeyIds = replacementRequests.flatMap((request) => (request.newKeyId ? [request.currentKeyId, request.newKeyId] : [request.currentKeyId]));
  const extraKeys = replacementKeyIds.length
    ? await prisma.accessKey.findMany({ where: { id: { in: replacementKeyIds } }, include: { user: true } })
    : [];
  const displayKeys = [...keys, ...extraKeys.filter((key) => !keys.some((loaded) => loaded.id === key.id))];
  const replacementByKeyId = buildKeyReplacementViews(replacementRequests);

  const pendingNotifications = notificationStats.find((item) => item.status === "PENDING")?._count._all ?? 0;
  const failedNotifications = notificationStats.find((item) => item.status === "FAILED")?._count._all ?? 0;
  const settings = view === "settings" ? await getNotificationSettings() : null;
  const restoreUsers =
    view === "restore"
      ? await prisma.user.findMany({
          select: { discordId: true, username: true, serverNickname: true },
          orderBy: { username: "asc" },
          take: 1000,
        })
      : [];

  // Historique d'audit des demandes affichées — une requête par lot, puis un index en mémoire.
  const audits = requests.length ? await fetchAudits(requests.map((request) => request.id)) : [];
  const auditsByRequest = new Map<string, AuditRow[]>();
  for (const row of audits) {
    if (!row.requestId) continue;
    const list = auditsByRequest.get(row.requestId);
    if (list) list.push(row);
    else auditsByRequest.set(row.requestId, [row]);
  }

  // Origine de chaque clé : audits de création, puis résolution des noms.
  const auditsByKeyId = await fetchOriginAudits(displayKeys.map((key) => key.id));
  const keyOrigins = displayKeys.map((key) => resolveKeyOrigin(key.id, auditsByKeyId));

  const directRequestIds = [...new Set(keyOrigins.flatMap((origin) => (origin.kind === "direct" ? [origin.accessRequestId] : [])))];
  const sponsorshipRequestIds = [...new Set(keyOrigins.flatMap((origin) => (origin.kind === "sponsorship" ? [origin.sponsorshipRequestId] : [])))];
  const [directRequests, sponsorshipSources] = await Promise.all([
    directRequestIds.length
      ? prisma.accessRequest.findMany({ where: { id: { in: directRequestIds } }, select: { id: true, decidedByDiscordId: true } })
      : Promise.resolve([]),
    sponsorshipRequestIds.length
      ? prisma.sponsorshipRequest.findMany({ where: { id: { in: sponsorshipRequestIds } }, include: { sponsor: true } })
      : Promise.resolve([]),
  ]);
  const directRequestById = new Map(directRequests.map((request) => [request.id, request]));
  const sponsorshipById = new Map(sponsorshipSources.map((request) => [request.id, request]));

  const originDiscordIds = new Set<string>();
  keyOrigins.forEach((origin) => {
    if (origin.kind === "manual" && origin.actorDiscordId) originDiscordIds.add(origin.actorDiscordId);
    if (origin.kind === "direct") {
      const decidedBy = directRequestById.get(origin.accessRequestId)?.decidedByDiscordId;
      if (decidedBy) originDiscordIds.add(decidedBy);
    }
    if (origin.kind === "sponsorship") {
      const request = sponsorshipById.get(origin.sponsorshipRequestId);
      if (request) {
        originDiscordIds.add(request.sponsor.discordId);
        if (request.decidedByDiscordId) originDiscordIds.add(request.decidedByDiscordId);
      }
    }
  });
  const originUsers = originDiscordIds.size
    ? await prisma.user.findMany({ where: { discordId: { in: [...originDiscordIds] } }, select: { discordId: true, username: true, serverNickname: true } })
    : [];
  const originNames = new Map(originUsers.map((user) => [user.discordId, user.serverNickname || user.username]));
  const originName = (discordId?: string | null) => (discordId ? originNames.get(discordId) ?? discordId : null);

  const originByKeyId = new Map<string, KeyOriginView>();
  displayKeys.forEach((key, index) => {
    const origin = keyOrigins[index];
    let view: KeyOriginView;
    switch (origin.kind) {
      case "direct": {
        const request = directRequestById.get(origin.accessRequestId);
        view = { kind: "direct", label: "Demande directe", approver: originName(request?.decidedByDiscordId), approverVerb: "Acceptée par" };
        break;
      }
      case "sponsorship": {
        const request = sponsorshipById.get(origin.sponsorshipRequestId);
        view = {
          kind: "sponsorship",
          label: request ? request.sponsor.serverNickname || request.sponsor.username : "Parrainage",
          approver: originName(request?.decidedByDiscordId),
          approverVerb: "Acceptée par",
        };
        break;
      }
      case "manual":
        view = { kind: "manual", label: "Restauration manuelle", approver: originName(origin.actorDiscordId), approverVerb: "Restaurée par" };
        break;
      default:
        view = { kind: "unknown", label: "—", approver: null, approverVerb: "" };
    }
    originByKeyId.set(key.id, view);
  });

  const keyRows: KeyRow[] = displayKeys.map((key) => {
    const replacement = replacementByKeyId.get(key.id) ?? null;
    return {
      id: key.id,
      member: key.user.serverNickname || key.user.username || key.user.discordId,
      discordId: key.user.discordId,
      fingerprint: accessKeyFingerprint(key.prefix, key.suffix),
      status: key.status,
      revokedAt: key.revokedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
      origin: originByKeyId.get(key.id) ?? { kind: "unknown", label: "—", approver: null, approverVerb: "" },
      replacementRequest: replacement
        ? {
            id: replacement.id,
            status: replacement.status,
            createdAt: replacement.createdAt.toISOString(),
            reason: replacement.reason,
            decisionComment: replacement.decisionComment,
            previousFingerprint: replacement.previousFingerprint,
            isResult: replacement.isResult,
          }
        : null,
    };
  });

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
    <Space direction="vertical" size="large" style={{ display: "flex" }}>
      <div>
        <Text type="secondary">Administration</Text>
        <Title level={2} style={{ margin: 0 }}>
          Gestion des accès
        </Title>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Link href="/admin?view=requests" style={{ display: "block", color: "inherit" }}>
            <Card hoverable>
              <Statistic title="Demandes en attente" value={pending} valueStyle={pending ? { color: "#cf1322" } : undefined} />
            </Card>
          </Link>
        </Col>
        <Col xs={12} md={6}>
          <Link href="/admin?view=keys" style={{ display: "block", color: "inherit" }}>
            <Card hoverable>
              <Statistic title="Clés actives" value={activeKeyCount} />
            </Card>
          </Link>
        </Col>
        <Col xs={12} md={6}>
          <Link href="/admin?view=settings" style={{ display: "block", color: "inherit" }}>
            <Card hoverable>
              <Statistic title="Notifications à traiter" value={pendingNotifications + failedNotifications} />
            </Card>
          </Link>
        </Col>
        <Col xs={12} md={6}>
          <Link href="/admin?view=users" style={{ display: "block", color: "inherit" }}>
            <Card hoverable>
              <Statistic title="Membres synchronisés" value={memberCount} />
            </Card>
          </Link>
        </Col>
      </Row>

      <Menu
        mode="horizontal"
        selectedKeys={[view]}
        items={VIEWS.map((item) => ({
          key: item.id,
          label: (
            <Link href={`/admin?view=${item.id}`}>
              {item.label}
              {item.id === "requests" && pending > 0 ? ` (${pending})` : ""}
            </Link>
          ),
        }))}
      />

      {view === "requests" && (
        <Card
          title="Demandes de parrainage"
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              {requestsTruncated ? `${requests.length} plus récentes sur ${requestTotal}` : requestTotal}
            </Text>
          }
        >
          <RequestTable requests={requestRows} />
          {requestsTruncated && (
            <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
              Seules les {REQUESTS_LIMIT} demandes les plus récentes sont chargées. Les plus anciennes restent consultables dans l’historique des clés et les journaux d’audit.
            </Paragraph>
          )}
        </Card>
      )}

      {view === "users" && <UserManagement />}

      {view === "restore" && (
        <Card title="Restaurer un accès">
          <Paragraph type="secondary" style={{ marginTop: -8 }}>
            Recherchez un membre actuellement sur le serveur Discord, puis attribuez-lui une clé active.
          </Paragraph>
          <RestoreAccessForm users={restoreUsers} />
        </Card>
      )}

      {view === "keys" && (
        <Card
          title="Historique des clés"
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              {keysTruncated ? `${keys.length} plus récentes sur ${keyTotal}` : keyTotal}
            </Text>
          }
        >
          <KeysTable rows={keyRows} />
        </Card>
      )}

      {view === "settings" && settings && (
        <Card
          title="Notifications Discord"
          extra={<Tag color={settings.discordNotificationsEnabled ? "green" : "default"}>{settings.discordNotificationsEnabled ? "Activées" : "Désactivées"}</Tag>}
        >
          <Paragraph type="secondary" style={{ marginTop: -8 }}>
            Réglages des notifications envoyées par le portail.
          </Paragraph>
          <form action={updateNotificationSettings}>
            <Row gutter={[24, 16]}>
              <Col xs={24} lg={12}>
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Checkbox name="discordNotificationsEnabled" value="true" defaultChecked={settings.discordNotificationsEnabled}>
                    <strong>Notifications privées activées</strong>
                    <Text type="secondary" style={{ display: "block" }}>
                      Les changements s’appliquent sans redémarrer le conteneur.
                    </Text>
                  </Checkbox>
                  <FormField
                    label="Intervalle de traitement"
                    hint="Entre 10 et 3 600 secondes. Les notifications sont traitées en arrière-plan ; aucune clé ni aucun token n’est transmis."
                  >
                    <Space>
                      <Input
                        id="notificationWorkerIntervalSeconds"
                        name="notificationWorkerIntervalSeconds"
                        type="number"
                        min={10}
                        max={3600}
                        step={1}
                        defaultValue={settings.notificationWorkerIntervalSeconds}
                        required
                        style={{ width: 120 }}
                      />
                      <Text type="secondary">secondes</Text>
                    </Space>
                  </FormField>
                </Space>
              </Col>
              <Col xs={24} lg={12}>
                <FormField
                  label="Webhook Discord des nouvelles demandes"
                  hint="L’URL est chiffrée et masquée. Elle sert uniquement à publier un embed lors d’une nouvelle demande d’accès. Laissez vide pour conserver le webhook actuel."
                >
                  <Space wrap style={{ width: "100%" }}>
                    <Password
                      id="accessRequestWebhookUrl"
                      name="accessRequestWebhookUrl"
                      autoComplete="new-password"
                      placeholder={settings.accessRequestWebhookConfigured ? "Webhook configuré — laisser vide pour le conserver" : "https://discord.com/api/webhooks/…"}
                      style={{ width: "100%", maxWidth: 420 }}
                    />
                    {settings.accessRequestWebhookConfigured && <Tag color="green">Configuré</Tag>}
                  </Space>
                </FormField>
              </Col>
              <Col span={24}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Dernière modification : {settings.updatedAt.toLocaleString("fr-FR")} {settings.updatedByDiscordId ? `par ${settings.updatedByDiscordId}` : "(initialisation)"}
                  </Text>
                  <Button type="primary" htmlType="submit">
                    Enregistrer
                  </Button>
                </div>
              </Col>
            </Row>
          </form>
          {settings.accessRequestWebhookConfigured && (
            <form action={clearAccessRequestWebhook} style={{ marginTop: 16 }}>
              <ConfirmSubmit
                title="Supprimer le webhook ?"
                message="Les nouvelles demandes ne seront plus envoyées à ce webhook. Cette action ne peut pas être annulée automatiquement."
                confirmLabel="Supprimer le webhook"
              >
                Supprimer le webhook
              </ConfirmSubmit>
            </form>
          )}
        </Card>
      )}
    </Space>
  );
}
