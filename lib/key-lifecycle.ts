import type { Prisma } from "@prisma/client";
import { queueNotification } from "@/lib/discord-notifications";

/**
 * Effets transactionnels partagés par les parcours qui révoquent ou remplacent une
 * clé : cohérence des statuts métier et annulation des demandes devenues orphelines.
 */

export const REPLACEMENT_CANCELLED_COMMENT = "Demande annulée : la clé concernée n'est plus active.";

/** Passe les demandes de parrainage et d'accès du membre à `KEY_REVOKED`. */
export async function markKeyReadyRequestsRevoked(tx: Prisma.TransactionClient, userId: string) {
  await tx.sponsorshipRequest.updateMany({ where: { referredId: userId, status: "KEY_READY" }, data: { status: "KEY_REVOKED" } });
  await tx.accessRequest.updateMany({ where: { requesterId: userId, status: "KEY_READY" }, data: { status: "KEY_REVOKED" } });
}

export type RejectedReplacement = { id: string; targetDiscordId: string };

/**
 * Rejette les demandes de remplacement `PENDING` dont la clé ciblée vient d'être
 * révoquée ou remplacée, pour ne pas laisser une demande impossible à traiter.
 * Renvoie les demandes rejetées afin de pouvoir notifier après le commit.
 */
export async function rejectPendingReplacements(
  tx: Prisma.TransactionClient,
  keyIds: string[],
  actorDiscordId: string,
  comment: string = REPLACEMENT_CANCELLED_COMMENT,
): Promise<RejectedReplacement[]> {
  const uniqueKeyIds = [...new Set(keyIds)];
  if (!uniqueKeyIds.length) return [];

  const pending = await tx.keyReplacementRequest.findMany({
    where: { currentKeyId: { in: uniqueKeyIds }, status: "PENDING" },
    include: { user: { select: { discordId: true } } },
  });
  if (!pending.length) return [];

  await tx.keyReplacementRequest.updateMany({
    where: { id: { in: pending.map((request) => request.id) }, status: "PENDING" },
    data: { status: "REJECTED", decidedByDiscordId: actorDiscordId, decidedAt: new Date(), decisionComment: comment },
  });

  return pending.map((request) => ({ id: request.id, targetDiscordId: request.user.discordId }));
}

/** Notifie les membres dont la demande a été annulée (à appeler après le commit). */
export async function notifyRejectedReplacements(rejected: RejectedReplacement[], comment: string = REPLACEMENT_CANCELLED_COMMENT) {
  await Promise.all(
    rejected.map((request) =>
      queueNotification({
        type: "KEY_REPLACEMENT_REJECTED",
        targetId: request.targetDiscordId,
        replacementRequestId: request.id,
        dedupeKey: `key-replacement-rejected:${request.id}`,
        message: `Votre demande de remplacement de clé a été refusée. Motif : ${comment}`,
      }),
    ),
  );
}
