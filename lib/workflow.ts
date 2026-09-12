import { prisma } from "@/lib/prisma";
import { audit, ensureUser, isAdmin } from "@/lib/access";
import { isDiscordMember } from "@/lib/membership";
import { createToken, decrypt, hash, mask } from "@/lib/crypto";
import { createAccessKey } from "@/lib/access-key";
import { queueNotification } from "@/lib/discord-notifications";
import {
  claimRefusal,
  nextStatusAfterDecision,
  rejectionReasonError,
  referredMembershipError,
  saveKeyEligibilityError,
  sponsorEligibilityError,
} from "@/lib/workflow-rules";

const CLAIM_TTL_MS = 15 * 60_000;

// ---------------------------------------------------------------------------
// Parrainage
// ---------------------------------------------------------------------------

type RequestInput = {
  referredIdentifier: string;
  relationship: string;
  knownSince: string;
  context: string;
  comment?: string;
  attestationAccepted?: boolean;
};

/** Résout un pseudo (nom Discord ou pseudo serveur) en identifiant Discord. */
async function resolveReferredDiscordId(identifier: string): Promise<string> {
  if (/^\d{17,20}$/.test(identifier)) return identifier;

  const normalized = identifier.toLocaleLowerCase().trim();
  const allUsers = await prisma.user.findMany({
    select: { discordId: true, username: true, serverNickname: true },
  });
  const matches = allUsers.filter((user) =>
    [user.username, user.serverNickname].some((value) => value?.toLocaleLowerCase().trim() === normalized),
  );

  if (matches.length === 1) return matches[0].discordId;
  throw new Error(
    matches.length > 1
      ? "Ce nom correspond à plusieurs membres. Utilisez leur Discord ID."
      : "Membre Discord introuvable. Synchronisez le serveur ou vérifiez le nom saisi.",
  );
}

export async function submitRequest(actor: { discordId: string; username: string }, input: RequestInput) {
  if (!input.attestationAccepted) throw new Error("L’attestation du parrain est obligatoire.");

  const referredDiscordId = await resolveReferredDiscordId(input.referredIdentifier.trim());
  if (referredDiscordId === actor.discordId) throw new Error("Auto-parrainage impossible.");
  const membershipError = referredMembershipError(await isDiscordMember(referredDiscordId));
  if (membershipError) throw new Error(membershipError);

  const sponsor = await ensureUser(actor.discordId, actor.username);
  const admin = isAdmin(actor.discordId);
  const permission = admin ? null : await prisma.sponsorPermission.findUnique({ where: { userId: sponsor.id } });
  const eligibilityError = sponsorEligibilityError(admin, !!permission);
  if (eligibilityError) throw new Error(eligibilityError);

  const referred = await ensureUser(referredDiscordId, referredDiscordId);
  const alreadyPending = await prisma.sponsorshipRequest.findFirst({
    where: { referredId: referred.id, status: "PENDING" },
  });
  if (alreadyPending) throw new Error("Une demande est déjà en attente pour cette personne.");

  const request = await prisma.sponsorshipRequest.create({
    data: {
      sponsorId: sponsor.id,
      referredId: referred.id,
      relationship: input.relationship,
      knownSince: input.knownSince,
      context: input.context,
      comment: input.comment,
      attestationAccepted: true,
      attestationAcceptedAt: new Date(),
    },
  });

  await audit("SPONSOR_REQUEST_CREATED", actor.discordId, referredDiscordId, request.id, undefined, { attestationAccepted: true });
  await queueNotification({
    type: "REQUEST_CREATED",
    targetId: actor.discordId,
    requestId: request.id,
    dedupeKey: `request-created:${request.id}`,
    message: "Votre demande de parrainage a bien été reçue.",
  });

  return request;
}

export async function decideRequest(requestId: string, actorDiscordId: string, approved: boolean, rejectionReason?: string) {
  const reasonError = rejectionReasonError(approved, rejectionReason);
  if (reasonError) throw new Error(reasonError);

  const request = await prisma.sponsorshipRequest.update({
    where: { id: requestId, status: "PENDING" },
    data: {
      status: nextStatusAfterDecision(approved),
      decidedAt: new Date(),
      decidedByDiscordId: actorDiscordId,
      rejectionReason: approved ? null : rejectionReason!.trim(),
    },
    include: { referred: true, sponsor: true },
  });

  const reason = request.rejectionReason ?? undefined;
  await audit(
    approved ? "SPONSOR_REQUEST_APPROVED" : "SPONSOR_REQUEST_REJECTED",
    actorDiscordId,
    request.referred.discordId,
    request.id,
    undefined,
    approved ? {} : { rejectionReason: reason },
  );

  const type = approved ? "REQUEST_APPROVED" : "REQUEST_REJECTED";
  await queueNotification({
    type,
    targetId: request.sponsor.discordId,
    requestId,
    dedupeKey: `${type.toLowerCase()}:sponsor:${request.id}`,
    message: approved
      ? "Votre demande de parrainage a été acceptée."
      : `Votre demande de parrainage a été refusée : ${reason}`,
  });
  await queueNotification({
    type,
    targetId: request.referred.discordId,
    requestId,
    dedupeKey: `${type.toLowerCase()}:referred:${request.id}`,
    message: approved
      ? "Votre demande de parrainage a été acceptée. La clé est en préparation."
      : "Votre demande de parrainage a été refusée. Le motif est indiqué sur le portail.",
  });

  return request;
}

// ---------------------------------------------------------------------------
// Clés d'accès
// ---------------------------------------------------------------------------

export async function saveKey(requestId: string, secret: string, actorDiscordId: string) {
  const request = await prisma.sponsorshipRequest.findUnique({ where: { id: requestId }, include: { referred: true } });
  if (!request) throw new Error("Cette demande n’est pas approuvée.");
  const eligibilityError = saveKeyEligibilityError(request.status, secret);
  if (eligibilityError) throw new Error(eligibilityError);
  const trimmed = secret.trim();
  const referredUserId = request.referredId;
  const referredDiscordId = request.referred.discordId;

  const key = await prisma.$transaction(async (tx) => {
    // Une seule clé active à la fois par membre.
    await tx.accessKey.updateMany({
      where: { userId: referredUserId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    const created = await createAccessKey(tx, referredUserId, trimmed);

    await tx.sponsorshipRequest.update({ where: { id: requestId }, data: { status: "KEY_READY" } });

    const auditBase = { actorDiscordId, targetDiscordId: referredDiscordId, requestId, keyId: created.id };
    await tx.auditLog.create({ data: { event: "ACCESS_KEY_CREATED", ...auditBase } });
    await tx.auditLog.create({ data: { event: "SPONSOR_REQUEST_KEY_READY", ...auditBase } });

    return created;
  });

  await queueNotification({
    type: "KEY_READY",
    targetId: referredDiscordId,
    requestId,
    keyId: key.id,
    dedupeKey: `key-ready:${key.id}`,
    message: `Votre clé est disponible. Connectez-vous au portail : ${process.env.NEXTAUTH_URL ?? ""}`,
  });

  return key;
}

export async function revokeKey(keyId: string, actorDiscordId: string) {
  const key = await prisma.$transaction(async (tx) => {
    const revoked = await tx.accessKey.update({
      where: { id: keyId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
      include: { user: true },
    });
    await tx.sponsorshipRequest.updateMany({
      where: { referredId: revoked.userId, status: "KEY_READY" },
      data: { status: "KEY_REVOKED" },
    });
    await tx.accessRequest.updateMany({
      where: { requesterId: revoked.userId, status: "KEY_READY" },
      data: { status: "KEY_REVOKED" },
    });
    return revoked;
  });

  const target = key.user.discordId;
  await audit("ACCESS_KEY_REVOKED", actorDiscordId, target, undefined, key.id);
  await audit("SPONSOR_REQUEST_KEY_REVOKED", actorDiscordId, target, undefined, key.id);
  await queueNotification({
    type: "KEY_REVOKED",
    targetId: target,
    keyId,
    dedupeKey: `key-revoked:${key.id}`,
    message: "Votre clé d’accès a été révoquée. Contactez l’équipe.",
  });

  return mask(`${key.prefix}xxxxxxxx${key.suffix}`);
}

// ---------------------------------------------------------------------------
// Récupération de la clé
// ---------------------------------------------------------------------------

export async function issueClaim(discordId: string) {
  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) throw new Error("Aucun accès ne vous est attribué.");

  const key = await prisma.accessKey.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!key) throw new Error("Votre clé n’est pas encore disponible.");

  const raw = createToken();
  await prisma.claimToken.create({
    data: { keyId: key.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + CLAIM_TTL_MS) },
  });
  await audit("CLAIM_LINK_CREATED", discordId, discordId, undefined, key.id);

  return raw;
}

/** Lien encore valide, affiché sur la page de récupération (sans le consommer). */
export async function claimOwner(raw: string) {
  return prisma.claimToken.findFirst({
    where: { tokenHash: hash(raw), claimedAt: null, expiresAt: { gt: new Date() } },
    include: { key: { include: { user: true } } },
  });
}

/**
 * Consomme le lien et renvoie la clé en clair. Un lien ne peut être consommé qu'une
 * fois : la garantie vient de la mise à jour conditionnelle (`claimedAt: null`), dont
 * le nombre de lignes touchées doit valoir exactement 1.
 */
export async function consumeClaim(raw: string, discordId: string) {
  return prisma.$transaction(async (tx) => {
    const token = await tx.claimToken.findFirst({
      where: { tokenHash: hash(raw), claimedAt: null, expiresAt: { gt: new Date() } },
      include: { key: { include: { user: true } } },
    });
    if (!token) return null;

    const refusal = claimRefusal(
      {
        claimedAt: token.claimedAt,
        expiresAt: token.expiresAt,
        keyStatus: token.key.status,
        keyOwnerDiscordId: token.key.user.discordId,
      },
      discordId,
      new Date(),
    );
    if (refusal) return null;

    const consumed = await tx.claimToken.updateMany({
      where: { id: token.id, claimedAt: null },
      data: { claimedAt: new Date() },
    });
    if (consumed.count !== 1) return null;

    await tx.auditLog.create({ data: { event: "ACCESS_CLAIMED", targetDiscordId: discordId, keyId: token.keyId } });
    return decrypt(token.key.encryptedSecret);
  });
}
