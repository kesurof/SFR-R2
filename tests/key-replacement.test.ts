import { describe, expect, it } from "vitest";
import { buildKeyReplacementAdminMessage, keyReplacementAdminUrl } from "../lib/key-replacement-notifications";
import { KEY_REPLACEMENT_REASON_MAX, keyReplacementDecisionError, keyReplacementInputError } from "../lib/key-replacement-rules";

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
