import { prisma } from "@/lib/prisma";

export const DEFAULT_NOTIFICATION_SETTINGS = {
  discordNotificationsEnabled: true,
  notificationWorkerIntervalSeconds: 30,
} as const;

export const NOTIFICATION_INTERVAL_MIN = 10;
export const NOTIFICATION_INTERVAL_MAX = 3600;
const isSnowflake = (value: string) => /^\d{17,20}$/.test(value);

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
      ...current,
      discordNotificationsEnabled: current.discordNotificationsEnabled === true,
      notificationWorkerIntervalSeconds: validInterval(current.notificationWorkerIntervalSeconds)
        ? current.notificationWorkerIntervalSeconds
        : DEFAULT_NOTIFICATION_SETTINGS.notificationWorkerIntervalSeconds,
    };
  }

  const data = { id: "global", discordNotificationsEnabled: envEnabled(), notificationWorkerIntervalSeconds: envInterval(), accessRequestChannelId: null };
  try {
    return await prisma.appSettings.create({ data });
  } catch (error) {
    // Deux requêtes simultanées au premier démarrage peuvent se rencontrer sur la ligne singleton.
    if ((error as { code?: string }).code !== "P2002") throw error;
    return (await prisma.appSettings.findUniqueOrThrow({ where: { id: "global" } }));
  }
}

export function parseNotificationSettingsInput(enabled: unknown, interval: unknown, accessRequestChannelId?: unknown) {
  const nextEnabled = enabled === true || enabled === "true" || enabled === "on";
  const nextInterval = Number(interval);
  if (!validInterval(nextInterval)) {
    throw new Error(`L'intervalle doit être compris entre ${NOTIFICATION_INTERVAL_MIN} et ${NOTIFICATION_INTERVAL_MAX} secondes.`);
  }
  const channel = String(accessRequestChannelId ?? "").trim();
  if (channel && !isSnowflake(channel)) throw new Error("L’identifiant du salon doit être un Discord ID valide.");
  return { discordNotificationsEnabled: nextEnabled, notificationWorkerIntervalSeconds: nextInterval, accessRequestChannelId: channel || null };
}
