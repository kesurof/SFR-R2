import { createSafeActionClient } from "next-safe-action";
import { describe, expect, it } from "vitest";
import { accessRequestFormSchema, notificationSettingsSchema, sponsorshipDecisionSchema, sponsorshipFormSchema } from "../lib/action-schemas";

describe("schémas de Server Actions", () => {
  it("nettoie les champs et convertit l’attestation du parrainage", () => {
    const form = new FormData();
    form.set("discordId", "  250000000000000001  ");
    form.set("relationship", "Ami");
    form.set("knownSince", "3 ans");
    form.set("context", "Contexte");
    form.set("attestationAccepted", "true");
    const parsed = sponsorshipFormSchema.parse(form);
    expect(parsed.discordId).toBe("250000000000000001");
    expect(parsed.attestationAccepted).toBe(true);
    expect(parsed.comment).toBeUndefined();
  });

  it("refuse une décision de refus sans motif via la règle métier", () => {
    const form = new FormData();
    form.set("requestId", "req-1");
    form.set("decision", "reject");
    const result = sponsorshipDecisionSchema.safeParse(form);
    expect(result.success).toBe(false);
  });

  it("applique les limites de la demande d’accès", () => {
    const form = new FormData();
    form.set("communitiesAndTrackers", "Communautés");
    form.set("motivations", "Motivations");
    form.set("selfHostingExperience", "");
    const result = accessRequestFormSchema.safeParse(form);
    expect(result.success).toBe(false);
  });

  it("valide l’intervalle des notifications via la règle existante", () => {
    const form = new FormData();
    form.set("discordNotificationsEnabled", "true");
    form.set("notificationWorkerIntervalSeconds", "5");
    const result = notificationSettingsSchema.safeParse(form);
    expect(result.success).toBe(false);
  });

  it("exécute une action typée à partir d’un FormData et retourne des erreurs typées", async () => {
    const client = createSafeActionClient();
    const action = client.inputSchema(sponsorshipDecisionSchema).action(async ({ parsedInput }) => parsedInput.decision);

    const valid = new FormData();
    valid.set("requestId", "req-1");
    valid.set("decision", "approve");
    const success = await action(valid);
    expect(success?.data).toBe("approve");
    expect(success?.validationErrors).toBeUndefined();

    const invalid = new FormData();
    invalid.set("requestId", "req-1");
    invalid.set("decision", "reject");
    const failure = await action(invalid);
    expect(failure?.validationErrors).toBeDefined();
    expect(failure?.data).toBeUndefined();
  });
});
