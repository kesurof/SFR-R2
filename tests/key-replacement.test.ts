import { describe, expect, it } from "vitest";
import { buildKeyReplacementAdminMessage, keyReplacementAdminUrl } from "../lib/key-replacement-notifications";
import { KEY_REPLACEMENT_REASON_MAX, buildKeyReplacementViews, keyReplacementDecisionError, keyReplacementInputError, matchesKeyFilters, type KeyReplacementViewSource } from "../lib/key-replacement-rules";

describe("remplacement de clé", () => {
  it("exige un motif et applique la limite de longueur", () => {
    expect(keyReplacementInputError("   ")).toMatch(/motif est obligatoire/);
    expect(keyReplacementInputError("a".repeat(KEY_REPLACEMENT_REASON_MAX + 1))).toMatch(/500 caractères/);
    expect(keyReplacementInputError("La clé ne fonctionne plus.")).toBeNull();
  });

  it("exige un motif pour le refus administrateur", () => {
    expect(keyReplacementDecisionError(" ")).toMatch(/motif est obligatoire/);
    expect(keyReplacementDecisionError("Clé non renouvelée dans le cadre demandé.")).toBeNull();
  });

  it("construit un lien direct et un DM administrateur sans secret", () => {
    const url = keyReplacementAdminUrl("https://app.example.com", "replacement_test");
    const message = buildKeyReplacementAdminMessage({
      memberName: "Pseudo test",
      username: "Utilisateur",
      discordId: "100000000000000001",
      reason: "La clé ne fonctionne plus.",
      createdAt: "2026-09-12T12:34:00.000Z",
      fingerprint: "abcd••••••••wxyz",
      adminUrl: url,
    });

    expect(url).toContain("/admin?view=keys&replacementRequest=replacement_test#replacement-replacement_test");
    expect(message).toContain("Pseudo test");
    expect(message).toContain("La clé ne fonctionne plus.");
    expect(message).toContain(url);
    expect(message).not.toContain("secret-en-clair");
  });
});

describe("rattachement des remplacements aux clés", () => {
  const request = (overrides: Partial<KeyReplacementViewSource> = {}) => ({
    id: "replacement_1",
    status: "PENDING",
    currentKeyId: "key_old",
    newKeyId: null,
    reason: "La clé ne fonctionne plus.",
    decisionComment: null,
    createdAt: new Date("2026-09-14T10:00:00.000Z"),
    currentKey: { prefix: "abcd", suffix: "wxyz" },
    ...overrides,
  });

  it("rattache un remplacement abouti à la nouvelle clé", () => {
    const views = buildKeyReplacementViews([
      request({ status: "COMPLETED", newKeyId: "key_new", decisionComment: "Traitée." }),
    ]);
    expect(views.has("key_old")).toBe(false);
    const view = views.get("key_new");
    expect(view).toBeDefined();
    expect(view?.isResult).toBe(true);
    expect(view?.status).toBe("COMPLETED");
    expect(view?.previousFingerprint).toBe("abcd••••••••wxyz");
  });

  it("rattache une demande en attente ou refusée à la clé ciblée", () => {
    const pending = buildKeyReplacementViews([request()]);
    expect(pending.get("key_old")?.isResult).toBe(false);
    expect(pending.get("key_old")?.status).toBe("PENDING");

    const rejected = buildKeyReplacementViews([request({ id: "replacement_2", status: "REJECTED", decisionComment: "Non." })]);
    expect(rejected.get("key_old")?.isResult).toBe(false);
    expect(rejected.get("key_old")?.decisionComment).toBe("Non.");
  });

  it("retombe sur la clé ciblée pour une demande aboutie sans nouvelle clé tracée", () => {
    const views = buildKeyReplacementViews([request({ status: "COMPLETED", newKeyId: null })]);
    expect(views.get("key_old")?.isResult).toBe(false);
  });

  it("conserve la demande la plus récente pour une même clé", () => {
    const views = buildKeyReplacementViews([
      request({ id: "recent", status: "REJECTED", createdAt: new Date("2026-09-14T12:00:00.000Z") }),
      request({ id: "ancien", status: "PENDING", createdAt: new Date("2026-09-14T08:00:00.000Z") }),
    ]);
    expect(views.get("key_old")?.id).toBe("recent");
  });
});

describe("filtres de la vue des clés", () => {
  const row = { member: "Membre test", discordId: "235787075012657152", fingerprint: "sfr_••••••••Vit6", status: "ACTIVE" };

  it("filtre par statut", () => {
    expect(matchesKeyFilters(row, { query: "", status: "ACTIVE" })).toBe(true);
    expect(matchesKeyFilters(row, { query: "", status: "REVOKED" })).toBe(false);
    expect(matchesKeyFilters(row, { query: "", status: "ALL" })).toBe(true);
  });

  it("recherche sur le membre, l'identifiant et l'empreinte", () => {
    expect(matchesKeyFilters(row, { query: "membre", status: "ALL" })).toBe(true);
    expect(matchesKeyFilters(row, { query: "235787075012657152", status: "ALL" })).toBe(true);
    expect(matchesKeyFilters(row, { query: "Vit6", status: "ALL" })).toBe(true);
    expect(matchesKeyFilters(row, { query: "introuvable", status: "ALL" })).toBe(false);
  });
});
