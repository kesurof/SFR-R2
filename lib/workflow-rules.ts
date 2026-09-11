// Règles métier pures du parrainage — aucun import, donc directement testables.

export const REJECTION_REASON_MAX = 500;

export type ClaimState = {
  claimedAt: Date | null;
  expiresAt: Date;
  keyStatus: string;
  keyOwnerDiscordId: string;
};

/** Motif pour lequel un lien de récupération est inutilisable. */
export type ClaimRefusal = "UNKNOWN" | "ALREADY_USED" | "EXPIRED" | "WRONG_OWNER" | "KEY_REVOKED";

/**
 * Un lien n'est utilisable qu'une seule fois, par son propriétaire, avant expiration,
 * et tant que la clé est active. Renvoie `null` si le lien est utilisable.
 */
export function claimRefusal(claim: ClaimState | null, actorDiscordId: string, now: Date): ClaimRefusal | null {
  if (!claim) return "UNKNOWN";
  if (claim.claimedAt !== null) return "ALREADY_USED";
  if (claim.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  if (claim.keyOwnerDiscordId !== actorDiscordId) return "WRONG_OWNER";
  if (claim.keyStatus !== "ACTIVE") return "KEY_REVOKED";
  return null;
}

export const isClaimUsable = (claim: ClaimState | null, actorDiscordId: string, now: Date) =>
  claimRefusal(claim, actorDiscordId, now) === null;

/** Valide le motif d'une décision. Renvoie `null` si la décision est acceptable. */
export function rejectionReasonError(approved: boolean, reason: string | null | undefined): string | null {
  const trimmed = reason?.trim() ?? "";
  if (approved) return trimmed.length > REJECTION_REASON_MAX ? `Le motif ne peut pas dépasser ${REJECTION_REASON_MAX} caractères.` : null;
  if (!trimmed) return "Un motif est obligatoire pour refuser une demande.";
  if (trimmed.length > REJECTION_REASON_MAX) return `Le motif ne peut pas dépasser ${REJECTION_REASON_MAX} caractères.`;
  return null;
}

export const nextStatusAfterDecision = (approved: boolean): "APPROVED" | "REJECTED" => (approved ? "APPROVED" : "REJECTED");

/** Un parrain doit être administrateur ou avoir reçu le droit de parrainer. */
export function sponsorEligibilityError(isAdmin: boolean, hasSponsorPermission: boolean): string | null {
  if (isAdmin || hasSponsorPermission) return null;
  return "Vous n’êtes pas autorisé à parrainer.";
}

/** Le filleul doit encore appartenir au serveur Discord privé. */
export function referredMembershipError(isMember: boolean): string | null {
  return isMember ? null : "Le filleul doit être membre du serveur Discord.";
}

/** Une clé ne peut être enregistrée que sur une demande acceptée. */
export function saveKeyEligibilityError(status: string | null | undefined, secret: string): string | null {
  if (!status || status !== "APPROVED") return "Cette demande n’est pas approuvée.";
  if (!secret.trim()) return "La clé ne peut pas être vide.";
  return null;
}
