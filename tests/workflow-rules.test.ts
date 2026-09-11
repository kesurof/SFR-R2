import { describe, expect, it } from "vitest";
import {
  REJECTION_REASON_MAX,
  claimRefusal,
  isClaimUsable,
  nextStatusAfterDecision,
  referredMembershipError,
  rejectionReasonError,
  saveKeyEligibilityError,
  sponsorEligibilityError,
  type ClaimState,
} from "../lib/workflow-rules";

const NOW = new Date("2026-01-01T12:00:00Z");
const inAnHour = new Date("2026-01-01T13:00:00Z");
const anHourAgo = new Date("2026-01-01T11:00:00Z");
const OWNER = "111111111111111111";

const claim = (overrides: Partial<ClaimState> = {}): ClaimState => ({
  claimedAt: null,
  expiresAt: inAnHour,
  keyStatus: "ACTIVE",
  keyOwnerDiscordId: OWNER,
  ...overrides,
});

describe("validité d'un lien de récupération", () => {
  it("accepte un lien neuf, du bon propriétaire, avec une clé active", () => {
    expect(claimRefusal(claim(), OWNER, NOW)).toBeNull();
    expect(isClaimUsable(claim(), OWNER, NOW)).toBe(true);
  });

  it("refuse un lien inconnu", () => {
    expect(claimRefusal(null, OWNER, NOW)).toBe("UNKNOWN");
    expect(isClaimUsable(null, OWNER, NOW)).toBe(false);
  });

  it("refuse un lien déjà utilisé — usage unique", () => {
    expect(claimRefusal(claim({ claimedAt: anHourAgo }), OWNER, NOW)).toBe("ALREADY_USED");
  });

  it("refuse un lien expiré", () => {
    expect(claimRefusal(claim({ expiresAt: anHourAgo }), OWNER, NOW)).toBe("EXPIRED");
  });

  it("refuse un lien ouvert par quelqu'un d'autre", () => {
    expect(claimRefusal(claim(), "222222222222222222", NOW)).toBe("WRONG_OWNER");
  });

  it("refuse un lien dont la clé a été révoquée", () => {
    expect(claimRefusal(claim({ keyStatus: "REVOKED" }), OWNER, NOW)).toBe("KEY_REVOKED");
  });

  it("privilégie « déjà utilisé » sur les autres motifs", () => {
    // Un lien consommé reste consommé, même si la clé a été révoquée entre-temps.
    expect(claimRefusal(claim({ claimedAt: anHourAgo, keyStatus: "REVOKED", expiresAt: anHourAgo }), OWNER, NOW)).toBe("ALREADY_USED");
  });

  it("expire à l'instant exact de l'échéance", () => {
    expect(claimRefusal(claim({ expiresAt: NOW }), OWNER, NOW)).toBe("EXPIRED");
  });
});

describe("décision sur une demande", () => {
  it("accepte une acceptation sans motif", () => {
    expect(rejectionReasonError(true, undefined)).toBeNull();
  });

  it("exige un motif pour un refus", () => {
    expect(rejectionReasonError(false, undefined)).toMatch(/motif est obligatoire/);
    expect(rejectionReasonError(false, "   ")).toMatch(/motif est obligatoire/);
  });

  it("accepte un refus motivé", () => {
    expect(rejectionReasonError(false, "Membre inconnu de toute l'équipe.")).toBeNull();
  });

  it("borne la longueur du motif", () => {
    expect(rejectionReasonError(false, "a".repeat(REJECTION_REASON_MAX))).toBeNull();
    expect(rejectionReasonError(false, "a".repeat(REJECTION_REASON_MAX + 1))).toMatch(/500 caractères/);
    expect(rejectionReasonError(true, "a".repeat(REJECTION_REASON_MAX + 1))).toMatch(/500 caractères/);
  });

  it("projette le statut suivant", () => {
    expect(nextStatusAfterDecision(true)).toBe("APPROVED");
    expect(nextStatusAfterDecision(false)).toBe("REJECTED");
  });
});

describe("éligibilité", () => {
  it("autorise un administrateur à parrainer", () => {
    expect(sponsorEligibilityError(true, false)).toBeNull();
  });

  it("autorise un parrain mandaté", () => {
    expect(sponsorEligibilityError(false, true)).toBeNull();
  });

  it("refuse un membre sans droit de parrainage", () => {
    expect(sponsorEligibilityError(false, false)).toMatch(/pas autorisé/);
  });

  it("exige que le filleul appartienne encore au serveur", () => {
    expect(referredMembershipError(true)).toBeNull();
    expect(referredMembershipError(false)).toMatch(/membre du serveur/);
  });

  it("n'accepte une clé que sur une demande acceptée", () => {
    expect(saveKeyEligibilityError(null, "secret")).toMatch(/pas approuvée/);
    expect(saveKeyEligibilityError("PENDING", "secret")).toMatch(/pas approuvée/);
    expect(saveKeyEligibilityError("KEY_READY", "secret")).toMatch(/pas approuvée/);
    expect(saveKeyEligibilityError("APPROVED", "secret")).toBeNull();
  });

  it("refuse une clé vide", () => {
    expect(saveKeyEligibilityError("APPROVED", "   ")).toMatch(/ne peut pas être vide/);
  });
});
