import { describe, expect, it } from "vitest";
import { DEFAULT_NOTIFICATION_SETTINGS, parseNotificationSettingsInput } from "../lib/settings";

describe("notification settings", () => {
  it("accepte les bornes de l'intervalle", () => {
    expect(parseNotificationSettingsInput("true", "10", "100000000000000003")).toEqual({ discordNotificationsEnabled: true, notificationWorkerIntervalSeconds: 10, accessRequestChannelId: "100000000000000003" });
    expect(parseNotificationSettingsInput(undefined, "3600")).toEqual({ discordNotificationsEnabled: false, notificationWorkerIntervalSeconds: 3600, accessRequestChannelId: null });
  });
  it("accepte un salon vide et refuse un ID invalide", () => { expect(parseNotificationSettingsInput("true", "10", "").accessRequestChannelId).toBeNull(); expect(() => parseNotificationSettingsInput("true", "10", "abc")).toThrow(/Discord ID/); });

  it("refuse les intervalles hors limites ou non numériques", () => {
    for (const value of ["9", "3601", "", "abc", "10.5"]) {
      expect(() => parseNotificationSettingsInput("true", value)).toThrow();
    }
  });

  it("conserve les valeurs par défaut documentées", () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS).toEqual({ discordNotificationsEnabled: true, notificationWorkerIntervalSeconds: 30 });
  });
});
