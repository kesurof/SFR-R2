import type { Prisma } from "@prisma/client";
import { encrypt, hash } from "@/lib/crypto";
import { accessKeySecretError } from "@/lib/access-key-rules";

/** Crée une clé complète sans jamais exposer le secret en dehors de la persistance chiffrée. */
export async function createAccessKey(tx: Prisma.TransactionClient, userId: string, secret: string) {
  const trimmed = secret.trim();
  const error = accessKeySecretError(trimmed);
  if (error) throw new Error(error);

  try {
    return await tx.accessKey.create({
      data: {
        userId,
        encryptedSecret: encrypt(trimmed),
        secretHash: hash(trimmed),
        prefix: trimmed.slice(0, 4),
        suffix: trimmed.slice(-4),
      },
    });
  } catch (caught) {
    // Index partiel `one_active_key_per_user` : une clé active existe déjà.
    if (caught && typeof caught === "object" && "code" in caught && caught.code === "P2002") {
      throw new Error("Une clé active existe déjà pour ce membre. Réessayez.");
    }
    throw caught;
  }
}
