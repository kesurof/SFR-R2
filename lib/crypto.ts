import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
const encryptionKey = () => { const key = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64"); if (key.length !== 32) throw new Error("ENCRYPTION_KEY doit contenir 32 octets encodés en base64."); return key; };
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const createToken = () => randomBytes(32).toString("base64url");
export function encrypt(secret: string) { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv); const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]); return [iv, cipher.getAuthTag(), ciphertext].map(x => x.toString("base64url")).join("."); }
export function decrypt(payload: string) { const [iv, tag, ciphertext] = payload.split(".").map(x => Buffer.from(x, "base64url")); const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv); decipher.setAuthTag(tag); return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"); }
export const mask = (secret: string) => `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`;
