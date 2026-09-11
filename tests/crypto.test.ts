import { describe, expect, it } from "vitest";
import { decrypt, encrypt, hash } from "../lib/crypto";

process.env.ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
describe("protection des secrets", () => {
  it("chiffre une clé sans conserver sa valeur dans le texte chiffré", () => { const secret = "abcd-une-cle-personnelle-wxyz"; const encrypted = encrypt(secret); expect(encrypted).not.toContain(secret); expect(decrypt(encrypted)).toBe(secret); });
  it("produit un hash stable sans révéler le token", () => { const token = "un-token-a-ne-jamais-stocker"; expect(hash(token)).toHaveLength(64); expect(hash(token)).toBe(hash(token)); expect(hash(token)).not.toContain(token); });
});
