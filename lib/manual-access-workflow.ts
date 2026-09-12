import { createAccessKey } from "@/lib/access-key";
import { isDiscordMember } from "@/lib/membership";
import { manualAccessInputError, type ManualAccessInput } from "@/lib/manual-access-rules";
import { prisma } from "@/lib/prisma";

/**
 * Restaure l'accès d'un membre actuellement présent sur le serveur Discord.
 * Le Discord ID est déduit de la recherche par nom/pseudo s'il n'est pas fourni.
 */
export async function restoreManualAccess(input: ManualAccessInput, actorDiscordId: string) {
  const error = manualAccessInputError(input);
  if (error) throw new Error(error);

  const username = input.username.trim();
  let discordId = input.discordId?.trim() ?? "";

  if (!discordId) {
    const matches = await prisma.user.findMany({
      where: { OR: [{ username }, { serverNickname: username }] },
      take: 2,
      select: { discordId: true },
    });
    if (matches.length === 0) throw new Error("Aucun membre ne correspond à ce nom.");
    if (matches.length > 1) throw new Error("Plusieurs membres correspondent à ce nom ; précisez la recherche.");
    discordId = matches[0].discordId;
  }

  if (!(await isDiscordMember(discordId))) {
    throw new Error("Ce membre n’est pas actuellement sur le serveur Discord.");
  }

  const serverNickname = input.serverNickname?.trim() || null;

  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { discordId } });
    const userCreated = !user;

    if (!user) {
      user = await tx.user.create({ data: { discordId, username, serverNickname } });
    }

    const activeKey = await tx.accessKey.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (activeKey) throw new Error("Cet utilisateur possède déjà une clé active. Utilisez le remplacement de clé.");

    const key = await createAccessKey(tx, user.id, input.secret);
    const metadata = JSON.stringify({ source: "MANUAL_RESTORE" });

    if (userCreated) {
      await tx.auditLog.create({
        data: {
          event: "USER_CREATED_MANUALLY",
          actorDiscordId,
          targetDiscordId: user.discordId,
          metadata,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        event: "ACCESS_KEY_RESTORED_MANUALLY",
        actorDiscordId,
        targetDiscordId: user.discordId,
        keyId: key.id,
        metadata,
      },
    });

    return { user, key, userCreated };
  });
}
