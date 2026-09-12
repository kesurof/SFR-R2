export const KEY_REPLACEMENT_REASON_MAX = 500;
export const KEY_REPLACEMENT_STATUSES = ["PENDING", "COMPLETED", "REJECTED"] as const;
export type KeyReplacementStatus = (typeof KEY_REPLACEMENT_STATUSES)[number];

export function keyReplacementInputError(reason: string): string | null {
  const trimmed = reason.trim();
  if (!trimmed) return "Un motif est obligatoire pour demander le remplacement de la clé.";
  if (trimmed.length > KEY_REPLACEMENT_REASON_MAX) return `Le motif est limité à ${KEY_REPLACEMENT_REASON_MAX} caractères.`;
  return null;
}

export function keyReplacementDecisionError(comment: string): string | null {
  const trimmed = comment.trim();
  if (!trimmed) return "Un motif est obligatoire pour refuser le remplacement de la clé.";
  if (trimmed.length > KEY_REPLACEMENT_REASON_MAX) return `Le motif est limité à ${KEY_REPLACEMENT_REASON_MAX} caractères.`;
  return null;
}
