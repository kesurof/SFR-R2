function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const raw = atob(normalized);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

/** Déchiffre le format AES-256-GCM produit par `lib/crypto` sans importer node:crypto dans l’instrumentation. */
export async function decryptWebhookSecret(payload: string) {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Webhook chiffré invalide.");

  const keyBytes = decodeBase64Url(process.env.ENCRYPTION_KEY ?? "");
  if (keyBytes.length !== 32) throw new Error("Clé de chiffrement invalide.");

  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle) throw new Error("Web Crypto indisponible.");

  const key = await webCrypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = decodeBase64Url(ivEncoded);
  const tag = decodeBase64Url(tagEncoded);
  const ciphertext = decodeBase64Url(ciphertextEncoded);
  const encrypted = new Uint8Array(ciphertext.length + tag.length);
  encrypted.set(ciphertext);
  encrypted.set(tag, ciphertext.length);
  const plaintext = await webCrypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, encrypted);
  return new TextDecoder().decode(plaintext);
}
