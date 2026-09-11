import { prisma } from "@/lib/prisma";
import { decryptWebhookSecret } from "@/lib/webhook-secret";

export const DEFAULT_NOTIFICATION_SETTINGS = {
  discordNotificationsEnabled: true,
  notificationWorkerIntervalSeconds: 30,
} as const;

export const NOTIFICATION_INTERVAL_MIN = 10;
export const NOTIFICATION_INTERVAL_MAX = 3600;
const DISCORD_WEBHOOK_HOSTS = new Set(["discord.com", "discordapp.com"]);

export function isValidDiscordWebhookUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      DISCORD_WEBHOOK_HOSTS.has(url.hostname.toLowerCase()) &&
      url.search === "" &&
      url.hash === "" &&
      /^\/api\/webhooks\/\d{17,20}\/[^/]+$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function envEnabled() {
  const value = process.env.DISCORD_NOTIFICATIONS_ENABLED?.trim().toLowerCase();
  return value === "false" ? false : DEFAULT_NOTIFICATION_SETTINGS.discordNotificationsEnabled;
}

function validInterval(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= NOTIFICATION_INTERVAL_MIN && value <= NOTIFICATION_INTERVAL_MAX;
}

function envInterval() {
  const value = Number(process.env.NOTIFICATION_WORKER_INTERVAL_SECONDS ?? DEFAULT_NOTIFICATION_SETTINGS.notificationWorkerIntervalSeconds);
  return validInterval(value) ? value : DEFAULT_NOTIFICATION_SETTINGS.notificationWorkerIntervalSeconds;
}

export async function getNotificationSettings() {
  const current = await prisma.appSettings.findUnique({ where: { id: "global" } });
  if (current) {
    return {
      id: current.id,
      discordNotificationsEnabled: current.discordNotificationsEnabled === true,
      notificationWorkerIntervalSeconds: validInterval(current.notificationWorkerIntervalSeconds)
        ? current.notificationWorkerIntervalSeconds
        : DEFAULT_NOTIFICATION_SETTINGS.notificationWorkerIntervalSeconds,
      accessRequestWebhookConfigured: Boolean(current.accessRequestWebhookEncrypted),
      updatedAt: current.updatedAt,
      updatedByDiscordId: current.updatedByDiscordId,
    };
  }

  const data = { id: "global", discordNotificationsEnabled: envEnabled(), notificationWorkerIntervalSeconds: envInterval(), accessRequestWebhookEncrypted: null };
  try {
    const created = await prisma.appSettings.create({ data });
    return {
      id: created.id,
      discordNotificationsEnabled: created.discordNotificationsEnabled === true,
      notificationWorkerIntervalSeconds: validInterval(created.notificationWorkerIntervalSeconds)
        ? created.notificationWorkerIntervalSeconds
        : DEFAULT_NOTIFICATION_SETTINGS.notificationWorkerIntervalSeconds,
      accessRequestWebhookConfigured: false,
      updatedAt: created.updatedAt,
      updatedByDiscordId: created.updatedByDiscordId,
    };
  } catch (error) {
    // Deux requêtes simultanées au premier démarrage peuvent se rencontrer sur la ligne singleton.
    if ((error as { code?: string }).code !== "P2002") throw error;
    return getNotificationSettings();
  }
}

export async function getAccessRequestWebhookUrl() {
  const current = await prisma.appSettings.findUnique({ where: { id: "global" }, select: { accessRequestWebhookEncrypted: true } });
  if (!current?.accessRequestWebhookEncrypted) return null;
  try {
    return await decryptWebhookSecret(current.accessRequestWebhookEncrypted);
  } catch {
    return null;
  }
}

export function parseNotificationSettingsInput(enabled: unknown, interval: unknown, accessRequestWebhookUrl?: unknown) {
  const nextEnabled = enabled === true || enabled === "true" || enabled === "on";
  const nextInterval = Number(interval);
  if (!validInterval(nextInterval)) {
    throw new Error(`L'intervalle doit être compris entre ${NOTIFICATION_INTERVAL_MIN} et ${NOTIFICATION_INTERVAL_MAX} secondes.`);
  }
  const webhook = String(accessRequestWebhookUrl ?? "").trim();
  if (webhook && !isValidDiscordWebhookUrl(webhook)) throw new Error("L’URL doit être un webhook Discord HTTPS valide.");
  return { discordNotificationsEnabled: nextEnabled, notificationWorkerIntervalSeconds: nextInterval, accessRequestWebhookUrl: webhook || null };
}
