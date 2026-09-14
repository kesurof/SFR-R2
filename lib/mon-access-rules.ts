export const ACCESS_STAGES = ["none", "pending", "approved", "ready", "rejected", "revoked"] as const;
export type AccessStage = (typeof ACCESS_STAGES)[number];

/** Position dans le parcours (pour le composant `Steps`). */
export const ACCESS_STAGE_STEP: Record<AccessStage, number> = { none: 0, pending: 1, approved: 2, ready: 4, rejected: 1, revoked: 2 };

/**
 * Quand un membre a plusieurs demandes (parrainage et/ou demande d'accès), l'étape
 * affichée est la plus avancée. Précédence : ready > revoked > approved > pending > rejected > none.
 */
const STAGE_PRIORITY: Record<AccessStage, number> = { ready: 5, revoked: 4, approved: 3, pending: 2, rejected: 1, none: 0 };

function stageFromStatus(status: string | null | undefined): AccessStage | null {
  switch (status) {
    case "KEY_READY":
      return "ready";
    case "KEY_REVOKED":
      return "revoked";
    case "APPROVED":
      return "approved";
    case "PENDING":
      return "pending";
    case "REJECTED":
      return "rejected";
    default:
      return null;
  }
}

export function computeAccessStage(input: {
  hasActiveKey: boolean;
  sponsorshipStatus?: string | null;
  accessRequestStatus?: string | null;
}): AccessStage {
  if (input.hasActiveKey) return "ready";

  const candidates = [stageFromStatus(input.sponsorshipStatus), stageFromStatus(input.accessRequestStatus)].filter(
    (stage): stage is AccessStage => stage !== null,
  );
  if (!candidates.length) return "none";

  return candidates.reduce((best, stage) => (STAGE_PRIORITY[stage] > STAGE_PRIORITY[best] ? stage : best));
}
