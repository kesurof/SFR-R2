import { describe, expect, it } from "vitest";
import { ACCESS_STAGE_STEP, computeAccessStage } from "../lib/mon-access-rules";

describe("étape d'accès du membre", () => {
  it("priorise une clé active", () => {
    expect(computeAccessStage({ hasActiveKey: true, sponsorshipStatus: "REJECTED" })).toBe("ready");
    expect(computeAccessStage({ hasActiveKey: true })).toBe("ready");
  });

  it("mappe les statuts d'une demande", () => {
    expect(computeAccessStage({ hasActiveKey: false, sponsorshipStatus: "KEY_READY" })).toBe("ready");
    expect(computeAccessStage({ hasActiveKey: false, sponsorshipStatus: "KEY_REVOKED" })).toBe("revoked");
    expect(computeAccessStage({ hasActiveKey: false, sponsorshipStatus: "APPROVED" })).toBe("approved");
    expect(computeAccessStage({ hasActiveKey: false, sponsorshipStatus: "PENDING" })).toBe("pending");
    expect(computeAccessStage({ hasActiveKey: false, sponsorshipStatus: "REJECTED" })).toBe("rejected");
    expect(computeAccessStage({ hasActiveKey: false })).toBe("none");
  });

  it("combine parrainage et demande d'accès selon la précédence", () => {
    expect(computeAccessStage({ hasActiveKey: false, sponsorshipStatus: "REJECTED", accessRequestStatus: "PENDING" })).toBe("pending");
    expect(computeAccessStage({ hasActiveKey: false, sponsorshipStatus: "PENDING", accessRequestStatus: "APPROVED" })).toBe("approved");
    expect(computeAccessStage({ hasActiveKey: false, sponsorshipStatus: "APPROVED", accessRequestStatus: "KEY_REVOKED" })).toBe("revoked");
    expect(computeAccessStage({ hasActiveKey: false, sponsorshipStatus: "KEY_READY", accessRequestStatus: "PENDING" })).toBe("ready");
  });

  it("expose la position dans le parcours", () => {
    expect(ACCESS_STAGE_STEP.ready).toBe(4);
    expect(ACCESS_STAGE_STEP.none).toBe(0);
  });
});
