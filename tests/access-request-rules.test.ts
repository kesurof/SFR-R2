import { describe, expect, it } from "vitest";
import { ACCESS_REQUEST_LIMITS, accessRequestStatus, accessRequestDecisionError, accessRequestInputError } from "../lib/access-request-rules";

const valid = { communitiesAndTrackers: "Discord A, tracker B", motivations: "Participer au projet.", selfHostingExperience: "Serveur personnel." };

describe("demande d’accès", () => {
  it("accepte les réponses attendues", () => expect(accessRequestInputError(valid)).toBeNull());
  it("exige les trois réponses essentielles", () => expect(accessRequestInputError({ ...valid, motivations: " " })).toMatch(/Motivations est obligatoire/));
  it("borne chaque réponse", () => expect(accessRequestInputError({ ...valid, communitiesAndTrackers: "a".repeat(ACCESS_REQUEST_LIMITS.communitiesAndTrackers + 1) })).toMatch(/600/));
  it("exige un commentaire pour un refus", () => { expect(accessRequestDecisionError(false)).toMatch(/obligatoire/); expect(accessRequestDecisionError(false, "Motif")).toBeNull(); });
  it("autorise un commentaire facultatif pour une acceptation", () => expect(accessRequestDecisionError(true)).toBeNull());
  it("accepte uniquement les statuts utilisables comme filtre", () => {
    expect(accessRequestStatus("PENDING")).toBe("PENDING");
    expect(accessRequestStatus("ARCHIVED")).toBeUndefined();
    expect(accessRequestStatus("invalide")).toBeUndefined();
  });
});
