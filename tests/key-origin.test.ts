import { describe, expect, it } from "vitest";
import { resolveKeyOrigin, previousKeyIdFromMetadata, type KeyOriginAudit } from "../lib/key-origin";

const audit = (overrides: Partial<KeyOriginAudit> = {}): KeyOriginAudit => ({
  event: "ACCESS_REQUEST_KEY_READY",
  actorDiscordId: null,
  requestId: null,
  metadata: "{}",
  ...overrides,
});

const map = (entries: Record<string, KeyOriginAudit>) => new Map(Object.entries(entries));

describe("origine d'une clé", () => {
  it("détecte une demande d'accès directe", () => {
    const audits = map({ key_1: audit({ metadata: JSON.stringify({ accessRequestId: "ar_1" }) }) });
    expect(resolveKeyOrigin("key_1", audits)).toEqual({ kind: "direct", accessRequestId: "ar_1" });
  });

  it("détecte un parrainage", () => {
    const audits = map({ key_1: audit({ event: "ACCESS_KEY_CREATED", requestId: "sp_1" }) });
    expect(resolveKeyOrigin("key_1", audits)).toEqual({ kind: "sponsorship", sponsorshipRequestId: "sp_1" });
  });

  it("détecte une restauration manuelle", () => {
    const audits = map({ key_1: audit({ event: "ACCESS_KEY_RESTORED_MANUALLY", actorDiscordId: "admin_1" }) });
    expect(resolveKeyOrigin("key_1", audits)).toEqual({ kind: "manual", actorDiscordId: "admin_1" });
  });

  it("remonte la chaîne des remplacements jusqu'à l'origine", () => {
    const audits = map({
      key_3: audit({ event: "ACCESS_KEY_REPLACED", metadata: JSON.stringify({ previousKeyId: "key_2" }) }),
      key_2: audit({ event: "ACCESS_KEY_REPLACED", metadata: JSON.stringify({ previousKeyId: "key_1" }) }),
      key_1: audit({ metadata: JSON.stringify({ accessRequestId: "ar_1" }) }),
    });
    expect(resolveKeyOrigin("key_3", audits)).toEqual({ kind: "direct", accessRequestId: "ar_1" });
  });

  it("renvoie unknown sans audit exploitable", () => {
    expect(resolveKeyOrigin("missing", new Map())).toEqual({ kind: "unknown" });
    const noPrevious = map({ key_1: audit({ event: "ACCESS_KEY_REPLACED", metadata: "{}" }) });
    expect(resolveKeyOrigin("key_1", noPrevious)).toEqual({ kind: "unknown" });
  });

  it("extrait previousKeyId d'une métadonnée valide", () => {
    expect(previousKeyIdFromMetadata(JSON.stringify({ previousKeyId: "key_2" }))).toBe("key_2");
    expect(previousKeyIdFromMetadata("pas du json")).toBeNull();
  });
});
