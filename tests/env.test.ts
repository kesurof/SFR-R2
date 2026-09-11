import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resetEnvCache, validateEnv } from "../lib/env";

const valid = { DATABASE_URL: "file:/tmp/test.db", NEXTAUTH_URL: "http://localhost:3000", AUTH_SECRET: "x".repeat(32), AUTH_DISCORD_ID: "123", AUTH_DISCORD_SECRET: "secret", DISCORD_GUILD_ID: "100000000000000001", ADMIN_DISCORD_IDS: "100000000000000002", ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"), DISCORD_BOT_TOKEN: "token" };
describe("configuration", () => {
  const original = process.env;
  beforeEach(() => { process.env = { ...original, ...valid }; resetEnvCache(); });
  afterEach(() => { process.env = original; resetEnvCache(); });
  it("valide la configuration complète", () => { expect(validateEnv().DISCORD_GUILD_ID).toBe(valid.DISCORD_GUILD_ID); });
  it("refuse une clé de chiffrement invalide", () => { process.env.ENCRYPTION_KEY = "bad"; expect(() => validateEnv()).toThrow(/ENCRYPTION_KEY/); });
  it("valide les réglages optionnels des notifications", () => {
    process.env.DISCORD_NOTIFICATIONS_ENABLED = "false";
    process.env.NOTIFICATION_WORKER_INTERVAL_SECONDS = "3600";
    expect(validateEnv().NOTIFICATION_WORKER_INTERVAL_SECONDS).toBe(3600);
  });
  it("refuse un intervalle de worker invalide", () => {
    process.env.NOTIFICATION_WORKER_INTERVAL_SECONDS = "5";
    expect(() => validateEnv()).toThrow(/NOTIFICATION_WORKER_INTERVAL_SECONDS/);
  });
});
