import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/access";
import { hash } from "@/lib/crypto";
import { createAccessKey } from "@/lib/access-key";
import { accessKeyFingerprint } from "@/lib/access-key-rules";
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
 * Remplacement direct par un administrateur, sans demande membre préalable. Une
 * demande `COMPLETED` synthétique est créée pour conserver la traçabilité dans la
 * vue des clés, et le membre est notifié comme pour un remplacement demandé.
 */
export async function replaceActiveKey(keyId: string, secret: string, actorDiscordId: string) {
  const trimmed = secret.trim();
  if (!trimmed) throw new Error("La nouvelle clé ne peut pas être vide.");

  const result = await prisma.$transaction(async (tx) => {
    const currentKey = await tx.accessKey.findUnique({ where: { id: keyId }, include: { user: true } });
    if (!currentKey || currentKey.status !== "ACTIVE") throw new Error("Cette clé n’est plus active.");

    const pending = await tx.keyReplacementRequest.findFirst({ where: { currentKeyId: keyId, status: "PENDING" } });
    if (pending) throw new Error("Une demande de remplacement est déjà en attente pour cette clé.");

    const created = await rotateAccessKey(tx, {
      currentKeyId: keyId,
      userId: currentKey.userId,
      currentSecretHash: currentKey.secretHash,
      secret: trimmed,
    });
    const replacement = await tx.keyReplacementRequest.create({
      data: {
        userId: currentKey.userId,
        currentKeyId: keyId,
        newKeyId: created.id,
        reason: "Remplacement initié par un administrateur.",
        status: "COMPLETED",
        decidedByDiscordId: actorDiscordId,
        decidedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        event: "ACCESS_KEY_REPLACED",
        actorDiscordId,
        targetDiscordId: currentKey.user.discordId,
        keyId: created.id,
        replacementRequestId: replacement.id,
        metadata: JSON.stringify({ previousKeyId: keyId, origin: "ADMIN" }),
      },
    });
    return { created, user: currentKey.user, replacementId: replacement.id };
  });

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
