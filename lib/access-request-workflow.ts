import { prisma } from "@/lib/prisma";
import { audit, ensureUser } from "@/lib/access";
import { encrypt, hash, mask } from "@/lib/crypto";
import { queueNotification } from "@/lib/discord-notifications";
import { accessRequestDecisionError, accessRequestInputError, type AccessRequestInput } from "@/lib/access-request-rules";
import { getNotificationSettings } from "@/lib/settings";

const adminIds = () => [...new Set((process.env.ADMIN_DISCORD_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean))];
const portal = () => process.env.NEXTAUTH_URL ?? "";

export async function submitAccessRequest(actor: { discordId: string; username: string }, input: AccessRequestInput) {
  const error = accessRequestInputError(input); if (error) throw new Error(error);
  const requester = await ensureUser(actor.discordId, actor.username);
  const pending = await prisma.accessRequest.findFirst({ where: { requesterId: requester.id, status: "PENDING" } });
  if (pending) throw new Error("Vous avez déjà une demande d’accès en attente.");
  const request = await prisma.accessRequest.create({ data: { requesterId: requester.id, communitiesAndTrackers: input.communitiesAndTrackers.trim(), motivations: input.motivations.trim(), selfHostingExperience: input.selfHostingExperience.trim(), discoverySource: input.discoverySource?.trim() || null } });
  await audit("ACCESS_REQUEST_CREATED", actor.discordId, actor.discordId, undefined, undefined, { accessRequestId: request.id });
  await queueNotification({ type: "ACCESS_REQUEST_CREATED", targetId: actor.discordId, accessRequestId: request.id, dedupeKey: `access-request-created:${request.id}`, message: "Votre demande d’accès a bien été reçue. L’équipe va l’examiner." });
  const settings = await getNotificationSettings();
  if (settings.accessRequestChannelId) await queueNotification({ type: "ACCESS_REQUEST_REVIEW", targetId: settings.accessRequestChannelId, targetKind: "CHANNEL", accessRequestId: request.id, dedupeKey: `access-request-review:${request.id}`, message: `Nouvelle demande d’accès de ${actor.username} (${actor.discordId}) : ${portal()}/demandes-acces?request=${request.id}` });
  return request;
}

export async function decideAccessRequest(id: string, actorDiscordId: string, approved: boolean, comment?: string) {
  const error = accessRequestDecisionError(approved, comment); if (error) throw new Error(error);
  const request = await prisma.accessRequest.update({ where: { id, status: "PENDING" }, data: { status: approved ? "APPROVED" : "REJECTED", decidedByDiscordId: actorDiscordId, decidedAt: new Date(), decisionComment: comment?.trim() || null }, include: { requester: true } });
  await audit(approved ? "ACCESS_REQUEST_APPROVED" : "ACCESS_REQUEST_REJECTED", actorDiscordId, request.requester.discordId, undefined, undefined, { accessRequestId: id, decisionComment: request.decisionComment });
  const suffix = request.decisionComment ? `\nCommentaire : ${request.decisionComment}` : "";
  await queueNotification({ type: approved ? "ACCESS_REQUEST_APPROVED" : "ACCESS_REQUEST_REJECTED", targetId: request.requester.discordId, accessRequestId: id, dedupeKey: `access-request-decision:${id}`, message: `Votre demande d’accès a été ${approved ? "acceptée" : "refusée"}.${suffix}` });
  if (approved) await Promise.all(adminIds().map((id) => queueNotification({ type: "ACCESS_REQUEST_KEY_REQUIRED", targetId: id, accessRequestId: request.id, dedupeKey: `access-request-key-required:${request.id}:${id}`, message: `Une demande d’accès approuvée attend une clé : ${portal()}/demandes-acces?request=${request.id}` })));
  return request;
}

export async function saveAccessRequestKey(id: string, secret: string, actorDiscordId: string) {
  if (!secret.trim()) throw new Error("La clé ne peut pas être vide.");
  const request = await prisma.accessRequest.findUnique({ where: { id }, include: { requester: true } });
  if (!request || request.status !== "APPROVED") throw new Error("Cette demande n’est pas approuvée.");
  const key = await prisma.$transaction(async (tx) => { await tx.accessKey.updateMany({ where: { userId: request.requesterId, status: "ACTIVE" }, data: { status: "REVOKED", revokedAt: new Date() } }); const created = await tx.accessKey.create({ data: { userId: request.requesterId, encryptedSecret: encrypt(secret.trim()), secretHash: hash(secret.trim()), prefix: secret.trim().slice(0, 4), suffix: secret.trim().slice(-4) } }); await tx.accessRequest.update({ where: { id }, data: { status: "KEY_READY" } }); await tx.auditLog.create({ data: { event: "ACCESS_REQUEST_KEY_READY", actorDiscordId, targetDiscordId: request.requester.discordId, keyId: created.id, metadata: JSON.stringify({ accessRequestId: id }) } }); return created; });
  await queueNotification({ type: "ACCESS_REQUEST_KEY_READY", targetId: request.requester.discordId, accessRequestId: id, keyId: key.id, dedupeKey: `access-request-key-ready:${key.id}`, message: `Votre clé est disponible. Connectez-vous au portail : ${portal()}` });
  return mask(`${key.prefix}xxxxxxxx${key.suffix}`);
}
