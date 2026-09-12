import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  discordNotification: {
    upsert: vi.fn(async () => ({ id: "notification-1" })),
    updateMany: vi.fn(async () => ({ count: 0 })),
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    update: vi.fn(async () => ({})),
  },
  accessRequest: { findUnique: vi.fn(async () => null) },
}));
const settingsMock = vi.hoisted(() => ({
  getNotificationSettings: vi.fn(async () => ({ discordNotificationsEnabled: true, notificationWorkerIntervalSeconds: 30 })),
  getAccessRequestWebhookUrl: vi.fn(async () => null),
  isValidDiscordWebhookUrl: vi.fn(() => true),
}));
const auditMock = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => undefined));

vi.mock("../lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../lib/settings", () => settingsMock);
vi.mock("../lib/access", () => ({ audit: auditMock }));

import { processPendingNotifications, queueNotification } from "../lib/discord-notifications";

const notification = { type: "REQUEST_CREATED", recipientDiscordId: "100000000000000001", dedupeKey: "dedupe-1", message: "Message" };

describe("notifications Discord — activation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsMock.getNotificationSettings.mockResolvedValue({ discordNotificationsEnabled: true, notificationWorkerIntervalSeconds: 30 });
    prismaMock.discordNotification.upsert.mockResolvedValue({ id: "notification-1" });
    prismaMock.discordNotification.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.discordNotification.findMany.mockResolvedValue([]);
  });

  it("ne met pas en file une notification quand c’est désactivé", async () => {
    settingsMock.getNotificationSettings.mockResolvedValue({ discordNotificationsEnabled: false, notificationWorkerIntervalSeconds: 30 });

    const result = await queueNotification(notification);

    expect(result).toBeNull();
    expect(prismaMock.discordNotification.upsert).not.toHaveBeenCalled();
  });

  it("met en file une notification quand c’est activé", async () => {
    const result = await queueNotification(notification);

    expect(result).toEqual({ id: "notification-1" });
    expect(prismaMock.discordNotification.upsert).toHaveBeenCalledTimes(1);
    expect(auditMock).toHaveBeenCalledTimes(1);
    expect(auditMock.mock.calls[0][0]).toBe("DISCORD_NOTIFICATION_QUEUED");
  });

  it("abandonne les notifications en attente quand c’est désactivé", async () => {
    settingsMock.getNotificationSettings.mockResolvedValue({ discordNotificationsEnabled: false, notificationWorkerIntervalSeconds: 30 });

    await processPendingNotifications();

    expect(prismaMock.discordNotification.updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING" },
      data: { status: "FAILED", lastErrorCode: "NOTIFICATIONS_DISABLED", nextAttemptAt: null },
    });
    expect(prismaMock.discordNotification.findMany).not.toHaveBeenCalled();
  });

  it("traite les notifications en attente quand c’est activé", async () => {
    await processPendingNotifications();

    expect(prismaMock.discordNotification.findMany).toHaveBeenCalledTimes(1);
  });
});
