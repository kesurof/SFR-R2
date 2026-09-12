import { beforeEach, describe, expect, it, vi } from "vitest";
import { decrypt } from "../lib/crypto";
import { accessKeySecretError } from "../lib/access-key-rules";
import { manualAccessInputError } from "../lib/manual-access-rules";

const prismaMock = vi.hoisted(() => ({ $transaction: vi.fn() }));
vi.mock("../lib/prisma", () => ({ prisma: prismaMock }));

import { restoreManualAccess } from "../lib/manual-access-workflow";

const input = {
  discordId: "100000000000000001",
  username: "Utilisateur restauré",
  serverNickname: "Pseudo restauré",
  secret: "abcd-cle-restauree-wxyz",
};

function transactionFor({ user, activeKey = null, failOnKeyCreate = false }: { user: Record<string, unknown> | null; activeKey?: { id: string } | null; failOnKeyCreate?: boolean }) {
  const createdUser = { id: "user-created", discordId: input.discordId, username: input.username, serverNickname: input.serverNickname };
  const createdKey = { id: "key-created", userId: user?.id ?? createdUser.id, prefix: "abcd", suffix: "wxyz" };
  const tx = {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
      create: vi.fn().mockResolvedValue(createdUser),
    },
    accessKey: {
      findFirst: vi.fn().mockResolvedValue(activeKey),
      create: failOnKeyCreate ? vi.fn().mockRejectedValue(new Error("échec de persistance")) : vi.fn().mockResolvedValue(createdKey),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  prismaMock.$transaction.mockImplementationOnce(async (callback: (transaction: typeof tx) => unknown) => callback(tx));
  return { tx, createdUser, createdKey };
}

describe("règles de restauration manuelle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("valide l’identité et la clé", () => {
    expect(manualAccessInputError(input)).toBeNull();
    expect(manualAccessInputError({ ...input, discordId: "123" })).toMatch(/Discord ID/);
    expect(manualAccessInputError({ ...input, username: " " })).toMatch(/nom Discord/);
    expect(manualAccessInputError({ ...input, secret: " " })).toMatch(/clé/);
    expect(accessKeySecretError(" ")).toMatch(/vide/);
  });

  it("crée un utilisateur absent, sa clé active et les audits sans secret", async () => {
    const { tx, createdUser, createdKey } = transactionFor({ user: null });

    const result = await restoreManualAccess(input, "200000000000000002");

    expect(result.user).toEqual(createdUser);
    expect(result.key).toEqual(createdKey);
    expect(tx.user.create).toHaveBeenCalledWith({ data: { discordId: input.discordId, username: input.username, serverNickname: input.serverNickname } });
    expect(tx.accessKey.findFirst).toHaveBeenCalledWith({ where: { userId: createdUser.id, status: "ACTIVE" }, select: { id: true } });
    expect(tx.auditLog.create).toHaveBeenCalledTimes(2);
    const auditPayloads = tx.auditLog.create.mock.calls.map(([call]) => JSON.stringify(call));
    expect(auditPayloads.join(" ")).toContain("USER_CREATED_MANUALLY");
    expect(auditPayloads.join(" ")).toContain("ACCESS_KEY_RESTORED_MANUALLY");
    expect(auditPayloads.join(" ")).not.toContain(input.secret);
  });

  it("réutilise un utilisateur existant sans écraser son profil", async () => {
    const existing = { id: "existing-user", discordId: input.discordId, username: "Nom synchronisé", serverNickname: "Pseudo synchronisé" };
    const { tx } = transactionFor({ user: existing });

    await restoreManualAccess(input, "200000000000000002");

    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ event: "ACCESS_KEY_RESTORED_MANUALLY", targetDiscordId: input.discordId }) }));
  });

  it("bloque la restauration si une clé active existe déjà", async () => {
    const { tx } = transactionFor({ user: { id: "existing-user", discordId: input.discordId }, activeKey: { id: "active-key" } });

    await expect(restoreManualAccess(input, "200000000000000002")).rejects.toThrow(/clé active/);
    expect(tx.accessKey.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("ne persiste aucun audit si la création de la clé échoue", async () => {
    const { tx } = transactionFor({ user: null, failOnKeyCreate: true });

    await expect(restoreManualAccess(input, "200000000000000002")).rejects.toThrow(/persistance/);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("création de clé partagée", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("chiffre le secret et ne conserve que ses métadonnées d’affichage", async () => {
    const create = vi.fn().mockResolvedValue({ id: "key", encryptedSecret: "encrypted" });
    const key = await (await import("../lib/access-key")).createAccessKey({ accessKey: { create } } as never, "user", input.secret);
    const data = create.mock.calls[0][0].data;

    expect(key.id).toBe("key");
    expect(data.encryptedSecret).not.toContain(input.secret);
    expect(decrypt(data.encryptedSecret)).toBe(input.secret);
    expect(data.secretHash).not.toContain(input.secret);
    expect(data.prefix).toBe("abcd");
    expect(data.suffix).toBe("wxyz");
  });
});
