export function accessKeySecretError(secret: string): string | null {
  return secret.trim() ? null : "La clé ne peut pas être vide.";
}
