import { describe, expect, it } from "vitest";
import { DEFAULT_NOTIFICATION_SETTINGS, isValidDiscordWebhookUrl, parseNotificationSettingsInput } from "../lib/settings";

describe("notification settings", () => {
  it("accepte les bornes de l'intervalle et un webhook Discord", () => {
    expect(parseNotificationSettingsInput("true", "10", "https://discord.com/api/webhooks/100000000000000003/synthetic-webhook-token")).toEqual({ discordNotificationsEnabled: true, notificationWorkerIntervalSeconds: 10, accessRequestWebhookUrl: "https://discord.com/api/webhooks/100000000000000003/synthetic-webhook-token" });
    expect(parseNotificationSettingsInput(undefined, "3600")).toEqual({ discordNotificationsEnabled: false, notificationWorkerIntervalSeconds: 3600, accessRequestWebhookUrl: null });
  });
  it("accepte un webhook vide et refuse une URL invalide", () => {
    expect(parseNotificationSettingsInput("true", "10", "").accessRequestWebhookUrl).toBeNull();
    expect(() => parseNotificationSettingsInput("true", "10", "https://example.com/api/webhooks/100000000000000003/token")).toThrow(/webhook Discord/);
  });

  it("n’accepte que les URLs HTTPS de webhook Discord", () => {
    expect(isValidDiscordWebhookUrl("https://discord.com/api/webhooks/100000000000000003/token")).toBe(true);
    expect(isValidDiscordWebhookUrl("https://discordapp.com/api/webhooks/100000000000000003/token")).toBe(true);
    expect(isValidDiscordWebhookUrl("http://discord.com/api/webhooks/100000000000000003/token")).toBe(false);
    expect(isValidDiscordWebhookUrl("https://discord.com/api/webhooks/100000000000000003/token?wait=true")).toBe(false);
  });

  it("refuse les intervalles hors limites ou non numériques", () => {
    for (const value of ["9", "3601", "", "abc", "10.5"]) {
      expect(() => parseNotificationSettingsInput("true", value)).toThrow();
    }
  });

  it("conserve les valeurs par défaut documentées", () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS).toEqual({ discordNotificationsEnabled: true, notificationWorkerIntervalSeconds: 30 });
  });
});
