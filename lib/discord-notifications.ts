import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/access";
import { getAccessRequestWebhookUrl, getNotificationSettings, isValidDiscordWebhookUrl } from "@/lib/settings";
import { buildAccessRequestWebhookPayload, sendDiscordWebhook } from "@/lib/discord-webhook";

type Input = { type: string; targetId?: string; recipientDiscordId?: string; targetKind?: "DM" | "CHANNEL" | "WEBHOOK"; requestId?: string; accessRequestId?: string; replacementRequestId?: string; keyId?: string; dedupeKey: string; message: string };

const API = "https://discord.com/api/v10";
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 5_000;
/** Délai après lequel un envoi resté en SENDING est considéré comme interrompu (crash, redéploiement). */
const STUCK_SENDING_MS = 2 * 60_000;
const BACKOFF_SECONDS = [60, 300];
const BATCH_SIZE = 20;

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function discordErrorCode(status: number) {
  if (status === 403 || status === 404) return "DM_DISABLED";
  if (status === 429) return "DISCORD_429";
  return "DISCORD_ERROR";
}

function webhookErrorCode(status: number) {
  if (status === 400 || status === 401 || status === 404) return "WEBHOOK_INVALID";
  if (status === 429) return "DISCORD_429";
  return "WEBHOOK_ERROR";
}

class PermanentNotificationError extends Error {}

function backoffMs(attemptsAfterFailure: number) {
  return BACKOFF_SECONDS[Math.min(attemptsAfterFailure - 1, BACKOFF_SECONDS.length - 1)] * 1000;
}

/**
 * Met un message en file. **N'échoue jamais** : une panne de notification ne doit pas
 * faire échouer l'action métier qui l'a déclenchée (le worker rattrapera l'envoi).
 */
export async function queueNotification(input: Input) {
  try {
    const targetId = input.targetId ?? input.recipientDiscordId ?? (input.targetKind === "WEBHOOK" ? "access-request-webhook" : undefined);
    if (!targetId) return null;
    if (!(await getNotificationSettings()).discordNotificationsEnabled) return null;

    const row = await prisma.discordNotification.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {},
      create: {
        type: input.type,
        targetId,
        targetKind: input.targetKind ?? "DM",
        requestId: input.requestId,
        accessRequestId: input.accessRequestId,
        replacementRequestId: input.replacementRequestId,
        keyId: input.keyId,
        dedupeKey: input.dedupeKey,
        message: input.message,
      },
    });

    await audit("DISCORD_NOTIFICATION_QUEUED", undefined, input.targetKind === "DM" ? targetId : undefined, input.requestId, input.keyId, { type: input.type, targetKind: input.targetKind ?? "DM" }, input.replacementRequestId);

    // Tentative immédiate sans bloquer l'appelant. La réservation atomique de
    // `deliverNotification` empêche tout doublon avec le worker.
    void deliverNotification(row.id).catch(() => {});
    return row;
  } catch {
    return null;
  }
}

type NotificationRow = {
  id: string;
  type: string;
  targetId: string;
  targetKind: string;
  requestId: string | null;
  accessRequestId: string | null;
  keyId: string | null;
  replacementRequestId: string | null;
  message: string;
  attempts: number;
};

/** Libère la réservation après échec : nouvelle tentative différée, ou abandon définitif. */
async function releaseAfterFailure(row: NotificationRow, errorCode: string) {
  const attempts = row.attempts + 1;
  const abandoned = attempts >= MAX_ATTEMPTS;

  await prisma.discordNotification.update({
    where: { id: row.id },
    data: {
      status: abandoned ? "FAILED" : "PENDING",
      attempts: { increment: 1 },
      lastErrorCode: errorCode,
      nextAttemptAt: abandoned ? null : new Date(Date.now() + backoffMs(attempts)),
    },
  });

  if (abandoned) {
    await audit("DISCORD_NOTIFICATION_FAILED", undefined, row.targetKind === "DM" ? row.targetId : undefined, row.requestId ?? undefined, row.keyId ?? undefined, { type: row.type, errorCode, targetKind: row.targetKind }, row.replacementRequestId ?? undefined);
  }
}

async function abandonNotification(row: NotificationRow, errorCode: string) {
  await prisma.discordNotification.update({
    where: { id: row.id },
    data: { status: "FAILED", attempts: { increment: 1 }, lastErrorCode: errorCode, nextAttemptAt: null },
  });
  await audit("DISCORD_NOTIFICATION_FAILED", undefined, row.targetKind === "DM" ? row.targetId : undefined, row.requestId ?? undefined, row.keyId ?? undefined, { type: row.type, errorCode, targetKind: row.targetKind }, row.replacementRequestId ?? undefined);
}

function accessRequestUrl(id: string) {
  const base = (process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "");
  if (!base) throw new PermanentNotificationError("WEBHOOK_REQUEST_URL_UNAVAILABLE");
  return `${base}/demandes-acces?request=${encodeURIComponent(id)}`;
}

async function deliverWebhookNotification(row: NotificationRow) {
  const webhookUrl = await getAccessRequestWebhookUrl();
  if (!webhookUrl || !isValidDiscordWebhookUrl(webhookUrl)) throw new PermanentNotificationError("WEBHOOK_NOT_CONFIGURED");
  if (!row.accessRequestId) throw new PermanentNotificationError("WEBHOOK_REQUEST_MISSING");

  const request = await prisma.accessRequest.findUnique({ where: { id: row.accessRequestId }, include: { requester: true } });
  if (!request) throw new PermanentNotificationError("WEBHOOK_REQUEST_NOT_FOUND");

  const payload = buildAccessRequestWebhookPayload({
    requesterName: request.requester.serverNickname || request.requester.username,
    createdAt: request.createdAt,
    requestUrl: accessRequestUrl(request.id),
  });

  let sent: Response;
  try {
    sent = await sendDiscordWebhook(webhookUrl, payload, fetchWithTimeout);
  } catch {
    throw new Error("WEBHOOK_TIMEOUT");
  }
  if (!sent.ok) {
    const errorCode = webhookErrorCode(sent.status);
    if (errorCode === "WEBHOOK_INVALID") throw new PermanentNotificationError(errorCode);
    throw new Error(errorCode);
  }
}

async function deliverNotification(id: string) {
  // Réservation atomique : un seul appelant (tentative immédiate ou worker) peut
  // passer la ligne de PENDING à SENDING. C'est ce qui garantit l'absence de doublon.
  const claimed = await prisma.discordNotification.updateMany({
    where: { id, status: "PENDING", attempts: { lt: MAX_ATTEMPTS } },
    data: { status: "SENDING" },
  });
  if (claimed.count !== 1) return;

  const row = await prisma.discordNotification.findUnique({ where: { id } });
  if (!row) return;

  try {
    if (row.targetKind === "WEBHOOK") {
      await deliverWebhookNotification(row);
    } else {
      if (row.targetKind === "CHANNEL" && row.type === "ACCESS_REQUEST_REVIEW") throw new PermanentNotificationError("CHANNEL_NOTIFICATION_DISABLED");
      const token = process.env.DISCORD_BOT_TOKEN;
      if (!token) {
        await releaseAfterFailure(row, "NO_TOKEN");
        return;
      }

      let channelId = row.targetId;
      if (row.targetKind === "DM") {
        const dm = await fetchWithTimeout(`${API}/users/@me/channels`, { method: "POST", headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ recipient_id: row.targetId }) });
        if (!dm.ok) throw new Error(discordErrorCode(dm.status));
        channelId = ((await dm.json()) as { id: string }).id;
      }

      const sent = await fetchWithTimeout(`${API}/channels/${channelId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: row.message || notificationText(row.type) }),
      });
      if (!sent.ok) throw new Error(discordErrorCode(sent.status));
    }

    await prisma.discordNotification.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastErrorCode: null, nextAttemptAt: null },
    });
    await audit("DISCORD_NOTIFICATION_SENT", undefined, row.targetKind === "DM" ? row.targetId : undefined, row.requestId ?? undefined, row.keyId ?? undefined, { type: row.type, targetKind: row.targetKind }, row.replacementRequestId ?? undefined);
  } catch (error) {
    if (error instanceof PermanentNotificationError) await abandonNotification(row, error.message);
    else await releaseAfterFailure(row, error instanceof Error ? error.message : "DISCORD_ERROR");
  }
}

/** Un processus interrompu en plein envoi laisse une ligne en SENDING : on la remet en file. */
async function recoverStuckNotifications() {
  await prisma.discordNotification.updateMany({
    where: { status: "SENDING", updatedAt: { lt: new Date(Date.now() - STUCK_SENDING_MS) } },
    data: { status: "PENDING" },
  });
}

/** Abandonne les notifications en attente : une notification désactivée ne doit jamais être reprise. */
export async function discardPendingNotifications() {
  const result = await prisma.discordNotification.updateMany({
    where: { status: "PENDING" },
    data: { status: "FAILED", lastErrorCode: "NOTIFICATIONS_DISABLED", nextAttemptAt: null },
  });
  return result.count;
}

export async function processPendingNotifications() {
  if (!(await getNotificationSettings()).discordNotificationsEnabled) {
    await discardPendingNotifications();
    return;
  }

  await recoverStuckNotifications();

  const now = new Date();
  const rows = await prisma.discordNotification.findMany({
    where: {
      status: "PENDING",
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  for (const row of rows) await deliverNotification(row.id);
}

type WorkerState = { started: boolean; running: boolean; timer?: ReturnType<typeof setTimeout>; wake?: () => void };
const workerGlobal = globalThis as typeof globalThis & { __discordNotificationWorker?: WorkerState };
const workerState: WorkerState = workerGlobal.__discordNotificationWorker ?? { started: false, running: false };
workerGlobal.__discordNotificationWorker = workerState;

export function startNotificationWorker() {
  if (workerState.started) return;
  workerState.started = true;

  const cycle = async () => {
    if (workerState.running) return;
    workerState.running = true;
    try {
      await processPendingNotifications();
    } catch {
      /* Le cycle suivant réessaiera sans interrompre le serveur. */
    }
    const settings = await getNotificationSettings().catch(() => null);
    const delay = Math.max(10, settings?.notificationWorkerIntervalSeconds ?? 30) * 1000;
    workerState.running = false;
    workerState.timer = setTimeout(() => void cycle(), delay);
    workerState.timer.unref?.();
  };

  workerState.wake = () => {
    if (workerState.running) return;
    if (workerState.timer) clearTimeout(workerState.timer);
    workerState.timer = undefined;
    void cycle();
  };

  void cycle();
}

export function wakeNotificationWorker() {
  workerState.wake?.();
}

/** Texte de repli pour les notifications créées avant la persistance du message. */
export function notificationText(type: string) {
  const url = process.env.NEXTAUTH_URL ?? "";
  const map: Record<string, string> = {
    REQUEST_CREATED: "Votre demande de parrainage a bien été reçue.",
    REQUEST_APPROVED: "Votre demande de parrainage a été acceptée.",
    REQUEST_REJECTED: "Une demande de parrainage a été refusée. Consultez le portail pour plus d’informations.",
    KEY_READY: `Votre clé est disponible. Connectez-vous au portail : ${url}`,
    KEY_REVOKED: "Votre clé d’accès a été révoquée. Contactez l’équipe.",
    KEY_REPLACED: `Votre nouvelle clé est disponible. Connectez-vous au portail : ${url}`,
    KEY_REPLACEMENT_REJECTED: "Votre demande de remplacement de clé a été refusée. Consultez le portail pour le motif.",
    KEY_REPLACEMENT_REQUESTED: `Une demande de remplacement de clé vous concerne. Consultez le portail : ${url}`,
    SPONSOR_GRANTED: "Le droit de parrainer vous a été accordé.",
    SPONSOR_REVOKED: "Votre droit de parrainer a été retiré.",
    ACCESS_REQUEST_WEBHOOK: "Nouvelle demande d’accès.",
  };
  return map[type] ?? "Une mise à jour est disponible sur le portail.";
}
