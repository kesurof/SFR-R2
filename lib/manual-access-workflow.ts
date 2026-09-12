import { createAccessKey } from "@/lib/access-key";
import { manualAccessInputError, type ManualAccessInput } from "@/lib/manual-access-rules";
import { prisma } from "@/lib/prisma";

export async function restoreManualAccess(input: ManualAccessInput, actorDiscordId: string) {
  const error = manualAccessInputError(input);
  if (error) throw new Error(error);

  const discordId = input.discordId.trim();
  const username = input.username.trim();
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
