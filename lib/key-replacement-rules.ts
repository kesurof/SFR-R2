import { accessKeyFingerprint } from "@/lib/access-key-rules";

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

export type KeyReplacementViewSource = {
  id: string;
  status: string;
  currentKeyId: string;
  newKeyId: string | null;
  reason: string;
  decisionComment: string | null;
  createdAt: Date;
  currentKey: { prefix: string; suffix: string };
};

export type KeyReplacementView = {
  id: string;
  status: string;
  reason: string;
  decisionComment: string | null;
  createdAt: Date;
  previousFingerprint: string;
  isResult: boolean;
};

/**
 * Rattache chaque demande à la clé qu'elle concerne : la nouvelle clé pour un
 * remplacement abouti, la clé ciblée sinon. En cas de demandes multiples pour une
 * même clé, la plus récente est conservée.
 */
export function buildKeyReplacementViews(requests: KeyReplacementViewSource[]): Map<string, KeyReplacementView> {
  const byKeyId = new Map<string, KeyReplacementView>();
  for (const request of requests) {
    const isResult = request.status === "COMPLETED" && Boolean(request.newKeyId);
    const keyId = isResult ? (request.newKeyId as string) : request.currentKeyId;
    const existing = byKeyId.get(keyId);
    if (existing && existing.createdAt.getTime() >= request.createdAt.getTime()) continue;
    byKeyId.set(keyId, {
      id: request.id,
      status: request.status,
      reason: request.reason,
      decisionComment: request.decisionComment,
      createdAt: request.createdAt,
      previousFingerprint: accessKeyFingerprint(request.currentKey.prefix, request.currentKey.suffix),
      isResult,
    });
  }
  return byKeyId;
}
