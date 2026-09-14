import type { AccessKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/access";
import { hash } from "@/lib/crypto";
import { createAccessKey } from "@/lib/access-key";
import { accessKeyFingerprint } from "@/lib/access-key-rules";
import {
  markKeyReadyRequestsRevoked,
  notifyRejectedReplacements,
  rejectPendingReplacements,
  type RejectedReplacement,
} from "@/lib/key-lifecycle";
import { queueNotification } from "@/lib/discord-notifications";
import { buildKeyReplacementAdminMessage, keyReplacementAdminUrl } from "@/lib/key-replacement-notifications";
import { keyReplacementDecisionError, keyReplacementInputError } from "@/lib/key-replacement-rules";

const adminIds = () => [...new Set((process.env.ADMIN_DISCORD_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean))];
const portal = () => (process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "");

/**
 * Rotation d'une clé active : garantit que la clé ciblée est encore active, refuse
 * une clé identique et crée la nouvelle. Le secret n'est jamais journalisé.
 */
async function rotateAccessKey(
  tx: Prisma.TransactionClient,
  input: { currentKeyId: string; userId: string; currentSecretHash: string; secret: string },
) {
  if (hash(input.secret) === input.currentSecretHash) throw new Error("La nouvelle clé doit être différente de l’ancienne.");
  const revoked = await tx.accessKey.updateMany({
    where: { id: input.currentKeyId, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  if (revoked.count !== 1) throw new Error("La clé ciblée n’est plus active.");
  return createAccessKey(tx, input.userId, input.secret);
}

export async function requestKeyReplacement(actor: { discordId: string }, reason: string) {
  const error = keyReplacementInputError(reason);
  if (error) throw new Error(error);

  const user = await prisma.user.findUnique({
    where: { discordId: actor.discordId },
    include: {
      accessKeys: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const currentKey = user?.accessKeys[0];
  if (!user || !currentKey) throw new Error("Aucune clé active ne peut être remplacée.");

  const pending = await prisma.keyReplacementRequest.findFirst({ where: { userId: user.id, status: "PENDING" } });
  if (pending) throw new Error("Une demande de remplacement est déjà en attente.");

  let request;
  try {
    request = await prisma.keyReplacementRequest.create({
      data: { userId: user.id, currentKeyId: currentKey.id, reason: reason.trim() },
      include: { user: true, currentKey: true },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new Error("Une demande de remplacement est déjà en attente.");
    }
    throw error;
  }

  await audit("ACCESS_KEY_REPLACEMENT_REQUESTED", undefined, user.discordId, undefined, currentKey.id, {}, request.id);
  const message = buildKeyReplacementAdminMessage({
    memberName: user.serverNickname || user.username,
    username: user.username,
    discordId: user.discordId,
    reason: request.reason,
    createdAt: request.createdAt,
    fingerprint: accessKeyFingerprint(currentKey.prefix, currentKey.suffix),
    adminUrl: keyReplacementAdminUrl(portal(), request.id),
  });

  await Promise.all(adminIds().map((adminId) => queueNotification({
    type: "KEY_REPLACEMENT_REQUESTED",
    targetId: adminId,
    replacementRequestId: request.id,
    keyId: currentKey.id,
    dedupeKey: `key-replacement-requested:${request.id}:${adminId}`,
    message,
  })));

  return request;
}

export async function replaceKey(requestId: string, secret: string, actorDiscordId: string) {
  const trimmed = secret.trim();
  if (!trimmed) throw new Error("La nouvelle clé ne peut pas être vide.");

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.keyReplacementRequest.findUnique({ where: { id: requestId }, include: { user: true, currentKey: true } });
    if (!request || request.status !== "PENDING") throw new Error("Cette demande de remplacement a déjà été traitée.");
    if (request.currentKey.status !== "ACTIVE") throw new Error("La clé ciblée n’est plus active.");

    const created = await rotateAccessKey(tx, {
      currentKeyId: request.currentKeyId,
      userId: request.userId,
      currentSecretHash: request.currentKey.secretHash,
      secret: trimmed,
    });
    await tx.keyReplacementRequest.update({ where: { id: requestId }, data: { status: "COMPLETED", newKeyId: created.id, decidedByDiscordId: actorDiscordId, decidedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        event: "ACCESS_KEY_REPLACED",
        actorDiscordId,
        targetDiscordId: request.user.discordId,
        keyId: created.id,
        replacementRequestId: requestId,
        metadata: JSON.stringify({ previousKeyId: request.currentKeyId }),
      },
    });
    return { created, user: request.user };
  });

  await queueNotification({
    type: "KEY_REPLACED",
    targetId: result.user.discordId,
    replacementRequestId: requestId,
    keyId: result.created.id,
    dedupeKey: `key-replacement-completed:${requestId}`,
    message: `Votre nouvelle clé est disponible. Connectez-vous au portail : ${portal()}/mon-acces`,
  });
  return result.created;
}

/**
 * Remplacement direct par un administrateur depuis la vue des clés, par identifiant
 * de clé. Une demande `COMPLETED` synthétique assure la traçabilité et le membre est
 * notifié comme pour un remplacement demandé.
 *
 * - Clé active : rotation (révocation conditionnelle de la clé ciblée), refusée si
 *   une demande de remplacement est déjà en attente.
 * - Clé révoquée : renouvellement ; toute clé active du membre est d'abord révoquée
 *   afin de garantir une seule clé active.
 */
export async function replaceKeyById(keyId: string, secret: string, actorDiscordId: string) {
  const trimmed = secret.trim();
  if (!trimmed) throw new Error("La nouvelle clé ne peut pas être vide.");

  const result = await prisma.$transaction(async (tx) => {
    const key = await tx.accessKey.findUnique({ where: { id: keyId }, include: { user: true } });
    if (!key) throw new Error("Cette clé est introuvable.");

    let created: AccessKey;
    let reason: string;
    let origin: string;
    let revokedActiveKeyIds: string[] = [];
    let rejected: RejectedReplacement[] = [];

    if (key.status === "ACTIVE") {
      const pending = await tx.keyReplacementRequest.findFirst({ where: { currentKeyId: keyId, status: "PENDING" } });
      if (pending) throw new Error("Une demande de remplacement est déjà en attente pour cette clé.");

      created = await rotateAccessKey(tx, {
        currentKeyId: keyId,
        userId: key.userId,
        currentSecretHash: key.secretHash,
        secret: trimmed,
      });
      reason = "Remplacement initié par un administrateur.";
      origin = "ADMIN";
    } else if (key.status === "REVOKED") {
      if (hash(trimmed) === key.secretHash) throw new Error("La nouvelle clé doit être différente de l’ancienne.");

      const activeKeys = await tx.accessKey.findMany({ where: { userId: key.userId, status: "ACTIVE" } });
      revokedActiveKeyIds = activeKeys.map((active) => active.id);
      if (revokedActiveKeyIds.length) {
        await tx.accessKey.updateMany({
          where: { id: { in: revokedActiveKeyIds }, status: "ACTIVE" },
          data: { status: "REVOKED", revokedAt: new Date() },
        });
      }
      rejected = await rejectPendingReplacements(tx, revokedActiveKeyIds, actorDiscordId);

      created = await createAccessKey(tx, key.userId, trimmed);
      reason = "Renouvellement d’une clé révoquée par un administrateur.";
      origin = "ADMIN_REVOKED";
    } else {
      throw new Error("Cette clé ne peut pas être remplacée.");
    }

    const replacement = await tx.keyReplacementRequest.create({
      data: {
        userId: key.userId,
        currentKeyId: keyId,
        newKeyId: created.id,
        reason,
        status: "COMPLETED",
        decidedByDiscordId: actorDiscordId,
        decidedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        event: "ACCESS_KEY_REPLACED",
        actorDiscordId,
        targetDiscordId: key.user.discordId,
        keyId: created.id,
        replacementRequestId: replacement.id,
        metadata: JSON.stringify({ previousKeyId: keyId, revokedActiveKeyIds, origin }),
      },
    });
    return { created, user: key.user, replacementId: replacement.id, rejected };
  });

  await notifyRejectedReplacements(result.rejected);
  await queueNotification({
    type: "KEY_REPLACED",
    targetId: result.user.discordId,
    replacementRequestId: result.replacementId,
    keyId: result.created.id,
    dedupeKey: `key-replaced-admin:${result.replacementId}`,
    message: `Votre nouvelle clé est disponible. Connectez-vous au portail : ${portal()}/mon-acces`,
  });
  return result.created;
}

export async function rejectKeyReplacement(requestId: string, comment: string, actorDiscordId: string) {
  const error = keyReplacementDecisionError(comment);
  if (error) throw new Error(error);

  const request = await prisma.keyReplacementRequest.findUnique({ where: { id: requestId }, include: { user: true } });
  if (!request || request.status !== "PENDING") throw new Error("Cette demande de remplacement a déjà été traitée.");
  const updated = await prisma.keyReplacementRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: "REJECTED", decidedByDiscordId: actorDiscordId, decidedAt: new Date(), decisionComment: comment.trim() },
  });
  if (updated.count !== 1) throw new Error("Cette demande de remplacement a déjà été traitée.");

  await audit("ACCESS_KEY_REPLACEMENT_REJECTED", actorDiscordId, request.user.discordId, undefined, undefined, { decisionComment: comment.trim() }, requestId);
  await queueNotification({
    type: "KEY_REPLACEMENT_REJECTED",
    targetId: request.user.discordId,
    replacementRequestId: requestId,
    dedupeKey: `key-replacement-rejected:${requestId}`,
    message: `Votre demande de remplacement de clé a été refusée. Motif : ${comment.trim()}`,
  });
}

/**
 * Suppression définitive d'une clé depuis l'administration. Une clé active est
 * d'abord révoquée (audit + notification comme une révocation), puis la clé est
 * supprimée avec les demandes de remplacement et jetons de récupération qui la
 * référencent. Un instantané est conservé dans l'audit `ACCESS_KEY_DELETED`.
 */
export async function deleteAccessKey(keyId: string, actorDiscordId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const key = await tx.accessKey.findUnique({ where: { id: keyId }, include: { user: true } });
    if (!key) throw new Error("Cette clé est introuvable.");

    if (key.status === "ACTIVE") {
      const revoked = await tx.accessKey.updateMany({
        where: { id: keyId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      if (revoked.count !== 1) throw new Error("Cette clé n’est plus active.");
      await markKeyReadyRequestsRevoked(tx, key.userId);
      await tx.auditLog.create({
        data: { event: "ACCESS_KEY_REVOKED", actorDiscordId, targetDiscordId: key.user.discordId, keyId },
      });
    }

    const linkedRequests = await tx.keyReplacementRequest.findMany({
      where: { OR: [{ currentKeyId: keyId }, { newKeyId: keyId }] },
      select: { id: true },
    });
    const linkedRequestIds = linkedRequests.map((request) => request.id);
    if (linkedRequestIds.length) {
      await tx.keyReplacementRequest.deleteMany({ where: { id: { in: linkedRequestIds } } });
    }
    await tx.claimToken.deleteMany({ where: { keyId } });
    await tx.accessKey.delete({ where: { id: keyId } });
    await tx.auditLog.create({
      data: {
        event: "ACCESS_KEY_DELETED",
        actorDiscordId,
        targetDiscordId: key.user.discordId,
        keyId,
        metadata: JSON.stringify({
          fingerprint: accessKeyFingerprint(key.prefix, key.suffix),
          previousStatus: key.status,
          wasActive: key.status === "ACTIVE",
          linkedReplacementRequestIds: linkedRequestIds,
        }),
      },
    });
    return { wasActive: key.status === "ACTIVE", user: key.user };
  });

  if (result.wasActive) {
    await queueNotification({
      type: "KEY_REVOKED",
      targetId: result.user.discordId,
      keyId,
      dedupeKey: `key-revoked:${keyId}`,
      message: "Votre clé d’accès a été révoquée. Contactez l’équipe.",
    });
  }
  return result;
}
